const { Dealer, User, AuditLog } = require('../models');
const { Op } = require('sequelize');
const RBACEngine = require('../services/rbacEngine');

/* ============================================================
   GET ALL DEALERS (Admin / Territory Manager / Area Manager)
============================================================ */
const getAllDealers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, state, isActive } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    // 🔍 Search filter
    if (search) {
      where[Op.or] = [
        { dealerCode: { [Op.like]: `%${search}%` } },
        { businessName: { [Op.like]: `%${search}%` } }
      ];
    }

    // 🌍 State filter
    if (state) where.state = state;

    // 🟢 Active/inactive filter
    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    // Use RBAC engine for scoping
    if (req.scope?.dealer) {
      Object.assign(where, req.scope.dealer);
    } else {
      const scopeWhere = await RBACEngine.buildScopeWhereClause(req.user, 'Dealer');
      Object.assign(where, scopeWhere);
    }

    const { count, rows } = await Dealer.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      dealers: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });

  } catch (error) {
    console.error("Get dealers error:", error);
    res.status(500).json({ error: "Failed to fetch dealers" });
  }
};

/* ============================================================
   GET DEALER BY ID
============================================================ */
const getDealerById = async (req, res) => {
  try {
    const dealer = await Dealer.findByPk(req.params.id);

    if (!dealer) {
      return res.status(404).json({ error: "Dealer not found" });
    }

    // Check if user can access this dealer
    const canAccess = await RBACEngine.canAccessResource(req.user, dealer);
    if (!canAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(dealer);

  } catch (error) {
    console.error("Get dealer error:", error);
    res.status(500).json({ error: "Failed to fetch dealer" });
  }
};

/* ============================================================
   CREATE DEALER
============================================================ */
const createDealer = async (req, res) => {
  try {
    const dealer = await Dealer.create(req.body);

    await AuditLog.create({
      userId: req.user.id,
      action: "CREATE_DEALER",
      entity: "Dealer",
      entityId: dealer.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    res.status(201).json(dealer);

  } catch (error) {
    console.error("Create dealer error:", error);
    res.status(500).json({ error: "Failed to create dealer" });
  }
};

/* ============================================================
   UPDATE DEALER
============================================================ */
const updateDealer = async (req, res) => {
  try {
    const dealer = await Dealer.findByPk(req.params.id);

    if (!dealer) {
      return res.status(404).json({ error: "Dealer not found" });
    }

    const oldData = dealer.toJSON();
    await dealer.update(req.body);

    await AuditLog.create({
      userId: req.user.id,
      action: "UPDATE_DEALER",
      entity: "Dealer",
      entityId: dealer.id,
      changes: { old: oldData, new: req.body },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    res.json(dealer);

  } catch (error) {
    console.error("Update dealer error:", error);
    res.status(500).json({ error: "Failed to update dealer" });
  }
};

/* ============================================================
   BLOCK / UNBLOCK DEALER
============================================================ */
const blockDealer = async (req, res) => {
  try {
    const dealer = await Dealer.findByPk(req.params.id);

    if (!dealer) {
      return res.status(404).json({ error: "Dealer not found" });
    }

    await dealer.update({ isBlocked: req.body.isBlocked });

    await AuditLog.create({
      userId: req.user.id,
      action: req.body.isBlocked ? "BLOCK_DEALER" : "UNBLOCK_DEALER",
      entity: "Dealer",
      entityId: dealer.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

    res.json(dealer);

  } catch (error) {
    console.error("Block dealer error:", error);
    res.status(500).json({ error: "Failed to block/unblock dealer" });
  }
};

/* ============================================================
   GET DEALER PROFILE (Logged-in Dealer)
============================================================ */
const getDealerProfile = async (req, res) => {
  try {
    if (req.user.role !== "dealer") {
      return res.status(403).json({ error: "Not authorized" });
    }

    const dealer = await Dealer.findByPk(req.user.dealerId);

    if (!dealer) {
      return res.status(404).json({ error: "Dealer profile not found" });
    }

    res.json(dealer);

  } catch (error) {
    console.error("Get dealer profile error:", error);
    res.status(500).json({ error: "Failed to fetch dealer profile" });
  }
};

/* ============================================================
   VERIFY DEALER (Admin / Key User)
============================================================ */
const verifyDealer = async (req, res) => {
  try {
    const dealer = await Dealer.findByPk(req.params.id);

    if (!dealer)
      return res.status(404).json({ error: "Dealer not found" });

    dealer.isVerified = true;
    await dealer.save();

    res.json({ message: "Dealer verified successfully", dealer });

  } catch (error) {
    console.error("verifyDealer error:", error);
    res.status(500).json({ error: "Failed to verify dealer" });
  }
};

/* ============================================================
   GET DEALERS ASSIGNED TO A MANAGER
============================================================ */
const getDealersByManager = async (req, res) => {
  try {
    if (!["territory_manager", "area_manager", "sm"].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const dealers = await Dealer.findAll({
      where: { managerId: req.user.id },
      order: [["createdAt", "DESC"]],
    });

    res.json({ dealers });

  } catch (err) {
    console.error("getDealersByManager error:", err);
    res.status(500).json({ error: "Failed to fetch assigned dealers" });
  }
};

/* ============================================================
   EXPORTS
============================================================ */
module.exports = {
  getAllDealers,
  getDealerById,
  createDealer,
  updateDealer,
  blockDealer,
  getDealerProfile,
  verifyDealer,
  getDealersByManager
};
