// src/controllers/orderController.js
const { Order, OrderItem, Material, Dealer, DealerMaterial, sequelize } = require("../models");
const { nextStage, isApproverForStage } = require("../utils/approvalEngine");
const RBACEngine = require("../services/rbacEngine");
const { WorkflowService } = require("../services/workflow");
const eventBus = require("../services/eventBus");
const inventoryService = require("../services/inventoryService");

// --------------------------------------
// PLACE ORDER  (Dealer / Dealer Staff / Sales Executive)
// Creates a draft/pending order; workflow starts on submit.
// --------------------------------------
exports.placeOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    // Determine dealer context
    let dealerId = req.user?.dealerId || req.body.dealerId;
    if (!dealerId) {
      return res.status(400).json({ error: "Missing dealerId" });
    }

    // Enforce that user is allowed to act for this dealer
    const allowedDealers = await RBACEngine.getDealersInScope(req.user);
    if (!allowedDealers.includes(dealerId)) {
      await t.rollback();
      return res.status(403).json({ error: "Dealer is out of scope for this user" });
    }

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

      // Ensure material is available for this dealer via mapping table
      const mapping = await DealerMaterial.findOne({
        where: {
          dealerId,
          materialId: it.materialId,
          isActive: true,
        },
      });

      if (!mapping) {
        await t.rollback();
        return res.status(400).json({
          error: `Material ${it.materialId} is not available for this dealer`,
        });
      }

      total += Number(it.qty) * Number(it.unitPrice || 0);
    }

    const order = await Order.create(
      {
        dealerId,
        orderNumber: `ORD-${Date.now()}`,
        status: "Pending", // draft / pre-submission
        totalAmount: total,
        notes,
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

    // Emit order created event
    await eventBus.emit('order:created', {
      orderId: order.id,
      dealerId: order.dealerId,
      orderNumber: order.orderNumber
    });

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
// SUBMIT ORDER FOR APPROVAL
// --------------------------------------
exports.submitOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const order = await Order.findByPk(id, { transaction: t });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: "Order not found" });
    }

    // Ensure current user is allowed to act for this dealer
    const allowedDealers = await RBACEngine.getDealersInScope(req.user);
    if (!allowedDealers.includes(order.dealerId)) {
      await t.rollback();
      return res
        .status(403)
        .json({ error: "Dealer is out of scope for this user" });
    }

    // Prevent double submission / submission after approval or rejection
    if (order.approvalStage || order.approvalStatus === "approved") {
      await t.rollback();
      return res
        .status(400)
        .json({ error: "Order is already in approval workflow" });
    }
    if (order.approvalStatus === "rejected") {
      await t.rollback();
      return res
        .status(400)
        .json({ error: "Rejected orders cannot be submitted" });
    }

    // Mark as pending approval in business status
    order.status = "Pending Approval";
    await order.save({ transaction: t });

    // Start workflow from first stage (dealer_admin)
    await WorkflowService.startWorkflow("order", order, req.user, {
      transaction: t,
    });

    await t.commit();

    return res.json({
      message: "Order submitted for approval",
      orderId: order.id,
      orderNumber: order.orderNumber,
      approvalStage: order.approvalStage,
      approvalStatus: order.approvalStatus,
      status: order.status,
    });
  } catch (err) {
    await t.rollback();
    console.error("submitOrder:", err);
    res
      .status(500)
      .json({ error: "Failed to submit order", details: err.message });
  }
};

// --------------------------------------
// DEALER / DEALER STAFF → MY ORDERS
// --------------------------------------
exports.getMyOrders = async (req, res) => {
  try {
    const roleName = req.user?.roleDetails?.name || req.user?.role;

    // Dealer roles: use their own dealerId
    if (roleName === "dealer_admin" || roleName === "dealer_staff") {
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

      return res.json({ orders });
    }

    // Sales Executive: show orders across assigned dealers
    if (roleName === "sales_executive") {
      const dealerIds = await RBACEngine.getDealersInScope(req.user);
      if (!dealerIds.length) {
        return res.json({ orders: [] });
      }

      const orders = await Order.findAll({
        where: { dealerId: { [require("sequelize").Op.in]: dealerIds } },
        include: [
          {
            model: OrderItem,
            as: "items",
            include: [{ model: Material, as: "material" }],
          },
          { model: Dealer, as: "dealer" },
        ],
        order: [["createdAt", "DESC"]],
      });

      return res.json({ orders });
    }

    // Other roles: fallback to scoped "all orders" behavior
    const whereClause = await RBACEngine.buildScopeWhereClause(req.user, "Order");
    const orders = await Order.findAll({
      where: whereClause,
      include: [
        {
          model: OrderItem,
          as: "items",
          include: [{ model: Material, as: "material" }],
        },
        { model: Dealer, as: "dealer" },
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
// DEALER ADMIN → PENDING ORDERS FOR APPROVAL
// --------------------------------------
exports.getPendingOrdersForApproval = async (req, res) => {
  try {
    const userRole = req.user.roleDetails?.name || req.user.role;
    const dealerId = req.user.dealerId;

    if (userRole === 'dealer_admin' && dealerId) {
      // Dealer admin sees orders from their dealer that are pending their approval
      const orders = await Order.findAll({
        where: {
          dealerId: dealerId,
          approvalStage: 'dealer_admin',
          approvalStatus: 'pending'
        },
        include: [
          { model: OrderItem, as: "items", include: [{ model: Material, as: "material" }] },
          { model: Dealer, as: "dealer" }
        ],
        order: [["createdAt", "DESC"]],
      });

      return res.json({ orders, count: orders.length });
    }

    // For other roles, use scoped approach
    let whereClause = {
      approvalStatus: 'pending'
    };

    if (req.scope?.order) {
      Object.assign(whereClause, req.scope.order);
    } else {
      const scopeWhere = await RBACEngine.buildScopeWhereClause(req.user, 'Order');
      Object.assign(whereClause, scopeWhere);
    }

    // Filter by current approval stage based on user's role
    if (userRole === 'territory_manager') {
      whereClause.approvalStage = 'territory_manager';
    } else if (userRole === 'area_manager') {
      whereClause.approvalStage = 'area_manager';
    } else if (userRole === 'regional_manager') {
      whereClause.approvalStage = 'regional_manager';
    } else if (userRole === 'regional_admin') {
      whereClause.approvalStage = 'regional_admin';
    }

    const orders = await Order.findAll({
      where: whereClause,
      include: [
        { model: OrderItem, as: "items", include: [{ model: Material, as: "material" }] },
        { model: Dealer, as: "dealer" },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ orders, count: orders.length });
  } catch (err) {
    console.error("getPendingOrdersForApproval:", err);
    res.status(500).json({ error: "Failed to load pending orders" });
  }
};

// --------------------------------------
// ADMIN / MANAGER → ALL ORDERS (SCOPED)
// --------------------------------------
exports.getAllOrders = async (req, res) => {
  try {
    // Use RBAC engine for scoping
    let whereClause = {};

    // If scoping middleware populated a scope, honor it
    if (req.scope?.order) {
      whereClause = { ...req.scope.order };
    } else {
      // Use RBAC engine to build scope
      whereClause = await RBACEngine.buildScopeWhereClause(req.user, 'Order');
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

    const oldStatus = order.status;
    order.status = status;
    await order.save({ transaction: t });

    // Use inventory service for stock management
    if (["Shipped", "Processing"].includes(status)) {
      await inventoryService.reduceStockOnOrderApproval(order.id, t);
    }

    // Handle status change events
    await inventoryService.handleOrderStatusChange(order.id, oldStatus, status);

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
    const { reason, notes } = req.body;
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: "items" }],
      transaction: t
    });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: "Order not found" });
    }

    // Use workflow service for approval
    const result = await WorkflowService.approve(
      "order",
      order,
      req.user,
      { remarks: notes || reason, transaction: t }
    );

    // If final approval, reduce stock
    if (result.isFinal) {
      await inventoryService.reduceStockOnOrderApproval(order.id, t);
    }

    await t.commit();

    return res.json({
      message: result.message,
      order: result.entity,
      stage: result.stage,
      isFinal: result.isFinal
    });
  } catch (err) {
    await t.rollback();
    console.error("approveOrder:", err);
    res.status(500).json({ error: "Failed to approve order", details: err.message });
  }
};


// --------------------------------------
// REJECT ORDER (Multi-stage)
// --------------------------------------
exports.rejectOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { reason } = req.body;
    const order = await Order.findByPk(req.params.id, { transaction: t });
    if (!order) {
      await t.rollback();
      return res.status(404).json({ error: "Order not found" });
    }

    // Use workflow service for rejection
    const result = await WorkflowService.reject(
      "order",
      order,
      req.user,
      { reason, rollback: true, transaction: t }
    );

    await t.commit();
    return res.json({ message: "Order rejected", order: result.entity });
  } catch (err) {
    await t.rollback();
    console.error("rejectOrder:", err);
    res.status(500).json({ error: "Failed to reject order", details: err.message });
  }
};

// --------------------------------------
// GET WORKFLOW STATUS
// --------------------------------------
exports.getWorkflowStatus = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const status = await WorkflowService.getWorkflowStatus("order", order);
    res.json({ success: true, workflow: status });
  } catch (err) {
    console.error("getWorkflowStatus:", err);
    res.status(500).json({ error: "Failed to get workflow status", details: err.message });
  }
};
