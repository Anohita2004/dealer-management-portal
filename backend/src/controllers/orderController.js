// src/controllers/orderController.js
const { Order, OrderItem, Material, Dealer, sequelize } = require("../models");
const { nextStage, isApproverForStage } = require("../utils/approvalEngine");
const { getDealersUnderUserScope } = require("../middleware/scoping");

// --------------------------------------
// PLACE ORDER  (Dealer / Dealer Staff)
// --------------------------------------
exports.placeOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const dealerId = req.user?.dealerId || req.body.dealerId;
    if (!dealerId)
      return res.status(400).json({ error: "Missing dealerId" });

    const { items = [], notes } = req.body;
    if (!items.length)
      return res.status(400).json({ error: "No items provided" });

    let total = 0;
    for (const it of items) {
      const mat = await Material.findByPk(it.materialId);
      if (!mat) {
        await t.rollback();
        return res
          .status(404)
          .json({ error: `Material ${it.materialId} not found` });
      }
      total += Number(it.qty) * Number(it.unitPrice || 0);
    }

    // Initialize approvalStage with first stage
    const firstStage = nextStage(null, "order");

    const order = await Order.create(
      {
        dealerId,
        orderNumber: `ORD-${Date.now()}`,
        status: "Pending",
        totalAmount: total,
        notes,
        approvalStage: firstStage,
        approvalStatus: "pending",
      },
      { transaction: t }
    );

    for (const it of items) {
      const lineTotal = Number(it.qty) * Number(it.unitPrice || 0);
      await OrderItem.create(
        {
          orderId: order.id,
          materialId: it.materialId,
          qty: it.qty,
          unitPrice: it.unitPrice,
          lineTotal,
        },
        { transaction: t }
      );
    }

    await t.commit();
    return res.status(201).json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      approvalStage: order.approvalStage,
      approvalStatus: order.approvalStatus,
    });
  } catch (err) {
    await t.rollback();
    console.error("placeOrder:", err);
    res.status(500).json({ error: "Failed to place order", details: err.message });
  }
};

// --------------------------------------
// DEALER / DEALER STAFF → MY ORDERS
// --------------------------------------
exports.getMyOrders = async (req, res) => {
  try {
    const dealerId = req.user?.dealerId;

    const orders = await Order.findAll({
      where: { dealerId },
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [{ model: Material, as: "material" }],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ orders });
  } catch (err) {
    console.error("getMyOrders:", err);
    res.status(500).json({ error: "Failed to load orders" });
  }
};

// --------------------------------------
// ADMIN / MANAGER → ALL ORDERS (SCOPED)
// --------------------------------------
exports.getAllOrders = async (req, res) => {
  try {
    const roleName = req.user.roleDetails?.name || req.user.role;
    let whereClause = {};

    // If scoping middleware populated a scope, honor it
    if (req.scope?.orders) {
      whereClause = { ...req.scope.orders };
    } else if (!['super_admin', 'technical_admin'].includes(roleName)) {
      // Fallback: compute scoped dealerIds
      const dealersUnderScope = await getDealersUnderUserScope(req.user);
      whereClause.dealerId = { [require('sequelize').Op.in]: dealersUnderScope };
    }

    const orders = await Order.findAll({
      where: whereClause,
      include: [
        { model: OrderItem, as: "items", include: [{ model: Material, as: "material" }] },
        { model: Dealer, as: "dealer" },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ orders });
  } catch (err) {
    console.error("getAllOrders:", err);
    res.status(500).json({ error: "Failed to load orders" });
  }
};

// --------------------------------------
// STATUS UPDATE (Admin / Manager)
// --------------------------------------
exports.updateOrderStatus = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findByPk(id, { include: [{ model: OrderItem, as: "items" }] });
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = status;
    await order.save({ transaction: t });

    if (["Shipped", "Processing"].includes(status)) {
      for (const item of order.items) {
        const mat = await Material.findByPk(item.materialId);
        if (mat) {
          mat.stock = Math.max(0, (mat.stock || 0) - item.qty);
          await mat.save({ transaction: t });
        }
      }
    }

    await t.commit();
    res.json({ order });
  } catch (err) {
    await t.rollback();
    console.error("updateOrderStatus:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
};

// --------------------------------------
// APPROVE ORDER (Multi-stage)
// --------------------------------------
exports.approveOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { OrderItem, Material } = require("../models");
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: "items" }],
      transaction: t
    });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: "Order not found" });
    }

    const role = req.user.roleDetails?.name || req.user.role;
    const currentStage = order.approvalStage;

    if (!isApproverForStage(role, currentStage, "order")) {
      await t.rollback();
      return res.status(403).json({
        error: `You are not authorized to approve at this stage (${currentStage}).`,
      });
    }

    const next = nextStage(currentStage, "order");

    if (!next) {
      // Final approval - reserve/reduce stock
      order.approvalStage = null;
      order.approvalStatus = "approved";
      order.status = "Approved";

      // Reserve/reduce stock for approved order
      for (const item of order.items) {
        const mat = await Material.findByPk(item.materialId, { transaction: t });
        if (mat) {
          const newStock = Math.max(0, (mat.stock || 0) - item.qty);
          await mat.update({ stock: newStock }, { transaction: t });
        }
      }
    } else {
      // Move to next stage
      order.approvalStage = next;
      order.approvalStatus = "pending";
    }

    order.approvedBy = req.user.id;
    order.approvedAt = new Date();

    await order.save({ transaction: t });
    await t.commit();

    return res.json({
      message: next ? `Order moved to next stage: ${next}` : "Order fully approved",
      order,
    });
  } catch (err) {
    await t.rollback();
    console.error("approveOrder:", err);
    res.status(500).json({ error: "Failed to approve order" });
  }
};


// --------------------------------------
// REJECT ORDER (Multi-stage)
// --------------------------------------
exports.rejectOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const role = req.user.roleDetails?.name || req.user.role;
    const currentStage = order.approvalStage;

    if (!isApproverForStage(role, currentStage)) {
      return res.status(403).json({
        error: `You are not authorized to reject at this stage (${currentStage}).`,
      });
    }

    order.approvalStatus = "rejected";
    order.status = "Rejected";
    order.rejectionReason = reason || "Rejected by approver";
    order.approvalStage = null;
    order.approvedBy = req.user.id;
    order.approvedAt = new Date();

    await order.save();
    return res.json({ message: "Order rejected", order });
  } catch (err) {
    console.error("rejectOrder:", err);
    res.status(500).json({ error: "Failed to reject order" });
  }
};
