// ==============================
// FILE: src/controllers/pricingController.js
// ==============================

const { PricingUpdate, AuditLog, Product, Dealer, Notification, sequelize } = require("../models");
const { Op } = require("sequelize");
const { nextStage, isApproverForStage } = require("../utils/approvalEngine");

// ----------------------------
// 1️⃣ Request Pricing Change (Dealer → Manager Notification)
// ----------------------------
exports.requestPricingChange = async (req, res) => {
  try {
    const { productId, oldPrice, newPrice, reason } = req.body;

    if (!productId || newPrice == null) {
      return res.status(400).json({ error: "productId and newPrice are required" });
    }

    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const update = await PricingUpdate.create({
      productId,
      oldPrice: oldPrice ?? product.price,
      newPrice,
      reason: reason || null,
      dealerId: req.user.dealerId || null,
      requestedBy: req.user.username || req.user.id,
      requestedByUserId: req.user.id,
      status: "pending",
      approvalStage: "area_manager",  // First stage of approval
      approvalStatus: "pending",
    });

    await AuditLog.create({
      userId: req.user.id,
      action: "PRICING_REQUEST",
      entity: "PricingUpdate",
      entityId: update.id,
      changes: { newPrice },
      ipAddress: req.ip,
    });

    // ✅ Create & Emit Notification for Managers
    const io = req.app.get("io");

    await Notification.create({
      senderId: req.user.id,
      recipientRole: "tm",
      title: "New Pricing Request Submitted",
      message: `${req.user.username} submitted a new pricing request for product ID ${productId}.`,
      type: "pricing",
      relatedId: update.id,
    });

    if (io) {
      io.to("role:tm").emit("notification", {
        title: "New Pricing Request",
        message: `${req.user.username} submitted a new pricing request for product ID ${productId}.`,
        type: "pricing",
      });
    }

    res.status(201).json({
      message: "Pricing request submitted",
      update,
    });
  } catch (err) {
    console.error("requestPricingChange:", err);
    res.status(500).json({ error: "Failed to submit pricing request" });
  }
};

// ----------------------------
// 2️⃣ Get Pricing Updates (Admin / Dealer)
// ----------------------------
exports.getPricingUpdates = async (req, res) => {
  try {
    const { mine, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    // Dealers see their requests only
    if (mine === "true" || req.user.role === "dealer") {
      where.requestedByUserId = req.user.id;
    }

    const { count, rows } = await PricingUpdate.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.json({ updates: rows, total: count });
  } catch (err) {
    console.error("getPricingUpdates:", err);
    res.status(500).json({ error: "Failed to fetch pricing updates" });
  }
};

// ----------------------------
// 3️⃣ Admin Pricing Summary
// ----------------------------
exports.getPricingSummary = async (req, res) => {
  try {
    const approved = await PricingUpdate.count({ where: { status: "approved" } });
    const pending = await PricingUpdate.count({ where: { status: "pending" } });
    const rejected = await PricingUpdate.count({ where: { status: "rejected" } });

    return res.json({ approved, pending, rejected });
  } catch (error) {
    console.error("Pricing summary error:", error);
    res.status(500).json({ error: "Failed to fetch pricing summary" });
  }
};

// ----------------------------
// 4️⃣ Manager’s Region/Territory Requests
// ----------------------------
exports.getManagerPricingRequests = async (req, res) => {
  try {
    const managerId = req.user.id;

    const updates = await PricingUpdate.findAll({
      include: [
        {
          model: Dealer,
          as: "dealer",
          where: { managerId },
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ updates });
  } catch (err) {
    console.error("getManagerPricingRequests:", err);
    res.status(500).json({ error: "Failed to fetch manager pricing requests" });
  }
};

// ----------------------------
// 5️⃣ Approve Pricing Request (Multi-Stage Workflow)
// ----------------------------
exports.approvePricingRequest = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { action, remarks } = req.body;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Use 'approve' or 'reject'" });
    }

    const pricingRequest = await PricingUpdate.findByPk(id, { transaction: t });
    if (!pricingRequest) {
      return res.status(404).json({ error: "Pricing request not found" });
    }

    const role = req.user.roleDetails?.name || req.user.role;
    const stage = pricingRequest.approvalStage || "area_manager";

    if (!isApproverForStage(role, stage, "pricing")) {
      return res.status(403).json({
        error: `Not authorized to approve/reject at stage: ${stage}`,
      });
    }

    if (action === "reject") {
      pricingRequest.approvalStatus = "rejected";
      pricingRequest.status = "rejected";
      pricingRequest.rejectionReason = remarks || "Rejected by approver";
      pricingRequest.approvalStage = null;
    } else {
      const next = nextStage(stage, "pricing");

      if (!next) {
        // Final approval - update product price
        pricingRequest.approvalStage = null;
        pricingRequest.approvalStatus = "approved";
        pricingRequest.status = "approved";

        // Update product price
        await Product.update(
          { price: pricingRequest.newPrice },
          { where: { id: pricingRequest.productId }, transaction: t }
        );
      } else {
        pricingRequest.approvalStage = next;
        pricingRequest.approvalStatus = "pending";
      }
    }

    pricingRequest.approvedBy = req.user.username || req.user.id;
    pricingRequest.approvedAt = new Date();
    pricingRequest.remarks = remarks;
    await pricingRequest.save({ transaction: t });

    await AuditLog.create(
      {
        userId: req.user.id,
        action: action === "approve" ? "PRICING_APPROVED" : "PRICING_REJECTED",
        entity: "PricingUpdate",
        entityId: pricingRequest.id,
        changes: { from: stage, to: next || "final", action, remarks },
        ipAddress: req.ip,
      },
      { transaction: t }
    );

    await t.commit();

    // Send notification
    const io = req.app.get("io");
    const statusMsg = pricingRequest.status;
    const statusEmoji = statusMsg === "approved" ? "✅" : "❌";

    await Notification.create({
      senderId: req.user.id,
      recipientId: pricingRequest.requestedByUserId,
      title: `Pricing ${statusMsg}`,
      message: `${statusEmoji} Your pricing request for Product ID ${pricingRequest.productId} was ${statusMsg}. ${remarks ? `Remarks: ${remarks}` : ""}`,
      type: "pricing",
      relatedId: pricingRequest.id,
    });

    if (io) {
      io.to(`user:${pricingRequest.requestedByUserId}`).emit("notification", {
        title: `Pricing ${statusMsg}`,
        message: `${statusEmoji} Your pricing request (Product ID ${pricingRequest.productId}) was ${statusMsg}`,
        type: "pricing",
      });
    }

    res.json({
      message: pricingRequest.status === "approved"
        ? `Pricing ${action}d successfully`
        : "Pricing request rejected",
      pricingRequest,
    });
  } catch (err) {
    await t.rollback();
    console.error("approvePricingRequest:", err);
    res.status(500).json({ error: "Failed to process pricing request" });
  }
};

// ----------------------------
// 6️⃣ Get Pending Pricing Requests (For Current Stage)
// ----------------------------
exports.getPendingPricingRequests = async (req, res) => {
  try {
    const role = req.user.roleDetails?.name || req.user.role;

    // Determine approval stage based on role
    let approvalStage;
    if (role === 'area_manager') approvalStage = 'area_manager';
    else if (role === 'regional_admin') approvalStage = 'regional_admin';
    else if (role === 'super_admin') approvalStage = 'super_admin';
    else {
      return res.status(403).json({ error: "Role not authorized for pricing approvals" });
    }

    const requests = await PricingUpdate.findAll({
      where: {
        approvalStage,
        approvalStatus: "pending"
      },
      include: [
        {
          model: Dealer,
          as: "dealer",
          attributes: ["id", "businessName", "dealerCode"]
        },
        {
          model: Product,
          as: "product",
          attributes: ["id", "name", "price"]
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ requests });
  } catch (err) {
    console.error("getPendingPricingRequests:", err);
    res.status(500).json({ error: "Failed to fetch pending pricing requests" });
  }
};

// Backward compatibility - single stage approval
exports.updatePricingStatus = async (req, res) => {
  console.warn("updatePricingStatus is deprecated. Use approvePricingRequest instead.");
  await exports.approvePricingRequest(req, res);
};
