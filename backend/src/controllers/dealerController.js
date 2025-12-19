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
    // Get fresh user data from database to ensure dealerId is current
    const user = await User.findByPk(req.user.id, {
      include: [
        { model: require('../models').Role, as: 'roleDetails' }
      ],
      attributes: ['id', 'dealerId', 'username', 'email', 'role', 'roleId', 'regionId', 'areaId', 'territoryId']
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check dealerId from database (more reliable than token)
    const dealerId = user.dealerId || req.user.dealerId;
    
    // If debug=true query param, return diagnostic info
    if (req.query.debug === 'true') {
      const dealer = dealerId ? await Dealer.findByPk(dealerId, {
        attributes: ['id', 'dealerCode', 'businessName', 'regionId', 'areaId', 'territoryId', 'managerId']
      }) : null;

      return res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          roleId: user.roleId,
          roleDetails: user.roleDetails,
          dealerId: user.dealerId,
          regionId: user.regionId,
          areaId: user.areaId,
          territoryId: user.territoryId
        },
        dealerInDB: dealer ? {
          id: dealer.id,
          dealerCode: dealer.dealerCode,
          businessName: dealer.businessName,
          regionId: dealer.regionId,
          areaId: dealer.areaId,
          territoryId: dealer.territoryId,
          managerId: dealer.managerId
        } : null,
        tokenData: {
          dealerId: req.user.dealerId,
          role: req.user.role,
          regionId: req.user.regionId,
          areaId: req.user.areaId,
          territoryId: req.user.territoryId
        },
        diagnosis: {
          hasDealerIdInDB: !!user.dealerId,
          hasDealerIdInToken: !!req.user.dealerId,
          dealerIdMatches: user.dealerId === req.user.dealerId,
          dealerExists: !!dealer,
          needsRelogin: user.dealerId && !req.user.dealerId,
          status: !user.dealerId 
            ? "❌ No dealerId in database - user needs to be assigned a dealer"
            : !dealer 
              ? "❌ DealerId exists but dealer not found - dealer may have been deleted"
              : user.dealerId !== req.user.dealerId
                ? "⚠️ DealerId in database but not in token - user needs to log out and log back in"
                : "✅ Account is properly linked to dealer"
        }
      });
    }
    
    if (!dealerId) {
      console.warn(`User ${user.username} (${user.role}) has no dealerId in database`);
      return res.status(400).json({ 
        error: "Your account is not linked to a dealer. Please contact an administrator to assign a dealer to your account.",
        userId: user.id,
        dealerIdInDB: user.dealerId,
        dealerIdInToken: req.user.dealerId,
        tip: "Add ?debug=true to the URL for detailed diagnostic information"
      });
    }

    const dealer = await Dealer.findByPk(dealerId);

    if (!dealer) {
      return res.status(404).json({ 
        error: "Dealer profile not found",
        dealerId: dealerId
      });
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
