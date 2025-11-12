// ==============================
// FILE: src/controllers/pricingController.js
// ==============================

const { PricingUpdate, AuditLog, Product } = require("../models");
const { Op } = require("sequelize");

// ----------------------------
// 1️⃣ Request Pricing Change
// ----------------------------
exports.requestPricingChange = async (req, res) => {
  try {
    const { productId, oldPrice, newPrice, reason } = req.body;

    if (!productId || newPrice == null) {
      return res
        .status(400)
        .json({ error: "productId and newPrice are required" });
    }

    const product = await Product.findByPk(productId);
    if (!product)
      return res.status(404).json({ error: "Product not found" });

    const update = await PricingUpdate.create({
      
      productId,
      oldPrice: oldPrice ?? product.price,
      newPrice,
      reason: reason || null,
      dealerId: req.user.dealerId || null,
      requestedBy: req.user.username || req.user.id,
      requestedByUserId: req.user.id,
      status: "pending",
    });

    await AuditLog.create({
      userId: req.user.id,
      action: "PRICING_REQUEST",
      entity: "PricingUpdate",
      entityId: update.id,
      changes: { newPrice },
      ipAddress: req.ip,
    });

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
    const approved = await PricingUpdate.count({
      where: { status: "approved" },
    });
    const pending = await PricingUpdate.count({
      where: { status: "pending" },
    });
    const rejected = await PricingUpdate.count({
      where: { status: "rejected" },
    });

    return res.json({ approved, pending, rejected });
  } catch (error) {
    console.error("Pricing summary error:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch pricing summary" });
  }
};
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

exports.updatePricingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const update = await PricingUpdate.findByPk(id);
    if (!update) return res.status(404).json({ error: "Request not found" });

    // If approved → update product price
    if (status === "approved") {
      await Product.update(
        { price: update.newPrice },
        { where: { id: update.productId } }
      );
    }

    update.status = status;
    update.remarks = remarks;
    update.approvedBy = req.user.username;
    update.approvedAt = new Date();
    await update.save();

    res.json({ message: "Status updated", update });
  } catch (err) {
    console.error("updatePricingStatus:", err);
    res.status(500).json({ error: "Failed to update pricing status" });
  }
};
