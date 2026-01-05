const { Dealer, User, Role, AuditLog, DealerMaterial, Material, UserDealer, sequelize } = require('../models');
const { Op } = require('sequelize');
const RBACEngine = require('../services/rbacEngine');
const { WorkflowService } = require('../services/workflow');

/* ============================================================
   GET ALL DEALERS (Admin / Territory Manager / Area Manager)
============================================================ */
const getAllDealers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { buildAdvancedWhere } = require('../utils/filterHelper');
    const where = buildAdvancedWhere(req.query, {
      searchFields: ['dealerCode', 'businessName', 'email', 'phoneNumber', 'city', 'state'],
      dateFields: ['createdAt', 'verifiedAt'],
      booleanFields: ['isActive', 'isBlocked', 'isVerified'],
      exactFields: ['status', 'state', 'regionId', 'areaId', 'territoryId']
    });

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
  const t = await sequelize.transaction();
  try {
    const payload = { ...req.body };

    // Validate required fields
    if (!payload.dealerCode) {
      await t.rollback();
      return res.status(400).json({ error: "Dealer code is required" });
    }

    if (!payload.businessName) {
      await t.rollback();
      return res.status(400).json({ error: "Business name is required" });
    }

    // Check if dealerCode already exists
    const existingDealer = await Dealer.findOne({
      where: { dealerCode: payload.dealerCode },
      transaction: t,
    });

    if (existingDealer) {
      await t.rollback();
      return res.status(400).json({ 
        error: "Dealer code already exists",
        message: `A dealer with code "${payload.dealerCode}" already exists. Please use a different code.`,
        field: "dealerCode"
      });
    }

    // Ensure new dealer starts in pending_approval state and inactive
    payload.status = "pending_approval";
    payload.isActive = false;
    payload.isVerified = false;

    const dealer = await Dealer.create(payload, { transaction: t });

    // Start dealer onboarding workflow (territory -> area -> regional manager -> regional admin)
    await WorkflowService.startWorkflow("dealer", dealer, req.user, {
      transaction: t,
    });

    await AuditLog.create(
      {
        userId: req.user.id,
        action: "CREATE_DEALER",
        entity: "Dealer",
        entityId: dealer.id,
        changes: payload,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      },
      { transaction: t }
    );

    await t.commit();

    console.log("✅ Dealer created successfully:", dealer.dealerCode);
    res.status(201).json(dealer);
  } catch (error) {
    await t.rollback();
    
    // Handle Sequelize unique constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors?.[0]?.path || 'field';
      const value = error.errors?.[0]?.value;
      console.error(`❌ Duplicate ${field}:`, value);
      
      return res.status(400).json({ 
        error: `${field} must be unique`,
        message: `A dealer with ${field} "${value}" already exists. Please use a different value.`,
        field: field,
        value: value
      });
    }

    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message).join(', ');
      console.error("❌ Validation error:", messages);
      
      return res.status(400).json({ 
        error: "Validation failed",
        message: messages,
        details: error.errors
      });
    }

    // Handle other errors
    console.error("❌ Create dealer error:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({ 
      error: "Failed to create dealer",
      message: process.env.NODE_ENV === "development" ? error.message : undefined
    });
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

    // Track potential manager change before update
    const previousManagerId = dealer.managerId;

    await dealer.update(req.body);

    // If managerId changed and the new manager is a sales_executive, sync UserDealer
    if (req.body.managerId && req.body.managerId !== previousManagerId) {
      const newManager = await User.findByPk(req.body.managerId, {
        include: [{ model: Role, as: "roleDetails" }],
      });
      const newManagerRole = newManager?.roleDetails?.name || newManager?.role;

      // If previous manager was a sales_executive, remove their mapping
      if (previousManagerId) {
        const prevManager = await User.findByPk(previousManagerId, {
          include: [{ model: Role, as: "roleDetails" }],
        });
        const prevRole = prevManager?.roleDetails?.name || prevManager?.role;
        if (prevManager && prevRole === "sales_executive") {
          await UserDealer.destroy({
            where: { userId: previousManagerId, dealerId: dealer.id },
          });
        }
      }

      // If new manager is a sales_executive, create mapping
      if (newManager && newManagerRole === "sales_executive") {
        await UserDealer.findOrCreate({
          where: { userId: newManager.id, dealerId: dealer.id },
          defaults: { isPrimary: true },
        });
      }
    }

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
   APPROVE / REJECT DEALER (Multi-Stage Onboarding)
============================================================ */
const approveDealer = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { action, reason, remarks } = req.body;

    const finalAction = action || "approve";
    if (!["approve", "reject"].includes(finalAction)) {
      await t.rollback();
      return res.status(400).json({ error: "Invalid action" });
    }

    const dealer = await Dealer.findByPk(id, { transaction: t });
    if (!dealer) {
      await t.rollback();
      return res.status(404).json({ error: "Dealer not found" });
    }

    // Scope check: ensure approver can see this dealer
    const canAccess = await RBACEngine.canAccessResource(req.user, {
      dealerId: dealer.id,
      regionId: dealer.regionId,
      areaId: dealer.areaId,
      territoryId: dealer.territoryId,
    });
    if (!canAccess) {
      await t.rollback();
      return res.status(403).json({ error: "Access denied for this dealer" });
    }

    let result;

    if (finalAction === "reject") {
      // Reject dealer onboarding
      result = await WorkflowService.reject("dealer", dealer, req.user, {
        reason,
        remarks,
        rollback: false,
        transaction: t,
      });
    } else {
      // Approve current stage
      result = await WorkflowService.approve("dealer", dealer, req.user, {
        remarks: remarks || reason,
        transaction: t,
      });

      // On final approval, ensure dealer is active and has a DealerAdmin user
      if (result.isFinal) {
        // Ensure status + flags are set (safety in case of older records)
        dealer.status = "active";
        dealer.isActive = true;
        dealer.isVerified = true;

        // Create dealer_admin user if none exists
        const existingAdmin = await User.findOne({
          where: { dealerId: dealer.id },
          include: [{ model: Role, as: "roleDetails" }],
          transaction: t,
        });

        const isDealerAdmin =
          existingAdmin &&
          (existingAdmin.roleDetails?.name === "dealer_admin" ||
            existingAdmin.role === "dealer");

        if (!isDealerAdmin) {
          const dealerAdminRole = await Role.findOne({
            where: { name: "dealer_admin" },
            transaction: t,
          });

          if (dealerAdminRole) {
            const baseUsername = dealer.dealerCode || dealer.businessName;
            const safeUsername = (baseUsername || "dealer")
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");

            const username = `${safeUsername}_${Date.now()}`;
            const email =
              dealer.email ||
              `${safeUsername || "dealer"}_${Date.now()}@example.local`;

            await User.create(
              {
                username,
                email,
                password: `${safeUsername || "Dealer"}@123`, // will be hashed by hook
                roleId: dealerAdminRole.id,
                dealerId: dealer.id,
                regionId: dealer.regionId,
                areaId: dealer.areaId,
                territoryId: dealer.territoryId,
                managerId: dealer.managerId || null,
                isActive: true,
                isBlocked: false,
              },
              { transaction: t }
            );
          } else {
            console.warn(
              "Dealer approved but Role 'dealer_admin' not found; skipping auto user creation"
            );
          }
        }

        await dealer.save({ transaction: t });
      }
    }

    await AuditLog.create(
      {
        userId: req.user.id,
        action:
          finalAction === "approve" ? "APPROVE_DEALER" : "REJECT_DEALER",
        entity: "Dealer",
        entityId: dealer.id,
        changes: { action: finalAction, reason, remarks },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      },
      { transaction: t }
    );

    await t.commit();

    return res.json({
      message:
        result?.message ||
        (finalAction === "approve"
          ? `Dealer ${dealer.status}`
          : `Dealer rejected`),
      dealer,
      stage: result?.currentStage || dealer.approvalStage,
      isFinal: !!result?.isFinal,
      reason: result?.reason || dealer.rejectionReason,
    });
  } catch (error) {
    await t.rollback();
    console.error("approveDealer error:", error);

    if (
      error.message &&
      (error.message.includes("cannot approve at stage") ||
        error.message.includes("cannot reject at stage"))
    ) {
      return res.status(403).json({
        error: "Access Denied — Workflow Validation Failed",
        message: error.message,
        userRole: req.user.role || req.user.roleDetails?.name,
        dealerId: req.params.id,
      });
    }

    res
      .status(500)
      .json({ error: "Failed to update dealer status", details: error.message });
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
    const roleName = req.user?.roleDetails?.name || req.user?.role;

    // Sales Executive: use user_dealers mapping
    if (roleName === "sales_executive") {
      const mappings = await UserDealer.findAll({
        where: { userId: req.user.id },
        attributes: ["dealerId"],
      });
      const dealerIds = mappings.map((m) => m.dealerId);

      if (!dealerIds.length) {
        return res.json({ dealers: [] });
      }

      const dealers = await Dealer.findAll({
        where: { id: { [Op.in]: dealerIds } },
        order: [["createdAt", "DESC"]],
      });

      return res.json({ dealers });
    }

    // Existing manager hierarchy (TM/AM/RM etc.) via dealer.managerId
    if (!["territory_manager", "area_manager", "regional_manager", "regional_admin", "dealer_admin", "dealer_staff", "super_admin", "technical_admin"].includes(roleName)) {
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
   DEALER ↔ MATERIAL MAPPINGS (ADMIN)
============================================================ */

// Admin: list materials assigned to a dealer
const getDealerMaterialsAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const dealer = await Dealer.findByPk(id);
    if (!dealer) {
      return res.status(404).json({ error: "Dealer not found" });
    }

    const mappings = await DealerMaterial.findAll({
      where: { dealerId: id, isActive: true },
      include: [{ model: Material, as: "material" }],
      order: [["createdAt", "DESC"]],
    });

    const materials = mappings.map((m) => m.material).filter(Boolean);

    return res.json({ materials, mappings });
  } catch (err) {
    console.error("getDealerMaterialsAdmin:", err);
    res.status(500).json({ error: "Failed to fetch dealer materials" });
  }
};

// Admin: bulk assign materials to a dealer
const assignDealerMaterials = async (req, res) => {
  try {
    const { id } = req.params;
    const { materialIds = [] } = req.body;

    const dealer = await Dealer.findByPk(id);
    if (!dealer) {
      return res.status(404).json({ error: "Dealer not found" });
    }

    if (!Array.isArray(materialIds) || materialIds.length === 0) {
      return res.status(400).json({ error: "materialIds array is required" });
    }

    const results = [];
    for (const materialId of materialIds) {
      const [mapping] = await DealerMaterial.findOrCreate({
        where: { dealerId: id, materialId },
        defaults: {
          isActive: true,
        },
      });

      if (!mapping.isActive) {
        mapping.isActive = true;
        await mapping.save();
      }

      results.push(mapping);
    }

    return res.status(200).json({ mappings: results });
  } catch (err) {
    console.error("assignDealerMaterials:", err);
    res.status(500).json({ error: "Failed to assign materials to dealer" });
  }
};

// Admin: unassign single material from dealer
const removeDealerMaterial = async (req, res) => {
  try {
    const { id, materialId } = req.params;

    const mapping = await DealerMaterial.findOne({
      where: { dealerId: id, materialId },
    });

    if (!mapping) {
      return res.status(404).json({ error: "Dealer-material mapping not found" });
    }

    mapping.isActive = false;
    await mapping.save();

    return res.json({ message: "Material unassigned from dealer" });
  } catch (err) {
    console.error("removeDealerMaterial:", err);
    res.status(500).json({ error: "Failed to unassign material from dealer" });
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
  approveDealer,
  getDealerProfile,
  verifyDealer,
  getDealersByManager,
  getDealerMaterialsAdmin,
  assignDealerMaterials,
  removeDealerMaterial
};
