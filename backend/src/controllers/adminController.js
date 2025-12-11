// src/controllers/adminController.js
const {
  Dealer,
  SalesGroup,
  PricingUpdate,
  Document,
  User,
  Region,
  AuditLog,
  Role,
  sequelize,
} = require('../models');

const { Op, fn, col, literal } = require('sequelize');

/**
 * Block / Unblock Dealer
 */
const blockDealer = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked = true, reason = null } = req.body;

    const dealer = await Dealer.findByPk(id);
    if (!dealer) return res.status(404).json({ error: 'Dealer not found' });

    await dealer.update({ isBlocked, blockReason: reason });

    await AuditLog.create({
      userId: req.user.id,
      action: isBlocked ? 'BLOCK_DEALER' : 'UNBLOCK_DEALER',
      entity: 'Dealer',
      entityId: dealer.id,
      changes: { isBlocked, reason },
      ipAddress: req.ip,
    });

    return res.json({ message: `Dealer ${isBlocked ? 'blocked' : 'unblocked'}`, dealer });
  } catch (err) {
    console.error('blockDealer:', err);
    return res.status(500).json({ error: 'Failed to update dealer block status' });
  }
};

/**
 * Verify Dealer (mark onboarding/license verified)
 */
const verifyDealer = async (req, res) => {
  try {
    const { id } = req.params;
    const { licenseNumber, licenseDocument } = req.body;

    const dealer = await Dealer.findByPk(id);
    if (!dealer) return res.status(404).json({ error: 'Dealer not found' });

    await dealer.update({
      isVerified: true,
      licenseNumber: licenseNumber ?? dealer.licenseNumber,
      licenseDocument: licenseDocument ?? dealer.licenseDocument,
      verifiedBy: req.user.username || req.user.id,
      verifiedAt: new Date(),
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'VERIFY_DEALER',
      entity: 'Dealer',
      entityId: dealer.id,
      changes: { licenseNumber },
      ipAddress: req.ip,
    });

    return res.json({ message: 'Dealer verified successfully', dealer });
  } catch (err) {
    console.error('verifyDealer:', err);
    return res.status(500).json({ error: 'Failed to verify dealer' });
  }
};

/**
 * Assign Region to Dealer
 */
const assignRegion = async (req, res) => {
  try {
    const { id } = req.params;
    const { regionId } = req.body;

    const dealer = await Dealer.findByPk(id);
    if (!dealer) return res.status(404).json({ error: 'Dealer not found' });

    const region = regionId ? await Region.findByPk(regionId) : null;
    if (regionId && !region) return res.status(400).json({ error: 'Region not found' });

    await dealer.update({ regionId });

    await AuditLog.create({
      userId: req.user.id,
      action: 'ASSIGN_REGION',
      entity: 'Dealer',
      entityId: dealer.id,
      changes: { regionId },
      ipAddress: req.ip,
    });

    return res.json({ message: 'Region assigned successfully', dealer });
  } catch (err) {
    console.error('assignRegion:', err);
    return res.status(500).json({ error: 'Failed to assign region' });
  }
};

/**
 * Merge Sales Groups (create a new group, move dealers)
 * Expects body: { groupIds: [1,2], newName: 'Merged', region, description }
 */
const mergeSalesGroups = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { groupIds = [], newName, region = null, description = null } = req.body;

    if (!Array.isArray(groupIds) || groupIds.length < 2) {
      await t.rollback();
      return res.status(400).json({ error: 'Need at least two groups to merge' });
    }
    if (!newName || !String(newName).trim()) {
      await t.rollback();
      return res.status(400).json({ error: 'newName is required' });
    }

    // Load groups with dealers
    const groups = await SalesGroup.findAll({
      where: { id: { [Op.in]: groupIds } },
      include: [{ model: Dealer, as: 'dealers', attributes: ['id'] }],
      transaction: t,
    });

    if (!groups || groups.length < 2) {
      await t.rollback();
      return res.status(404).json({ error: 'One or more groups not found' });
    }

    // Create new group
    const newGroup = await SalesGroup.create(
      { name: newName, region, description },
      { transaction: t }
    );

    // Collect dealer IDs
    const dealerIds = [
      ...new Set(
        groups.flatMap((g) =>
          (g.dealers || []).map((d) => (typeof d.id === 'object' ? d.id.toString() : d.id))
        )
      ),
    ];

    // If through table exists, use addDealers; otherwise manage association via raw query
    if (typeof newGroup.addDealers === 'function') {
      await newGroup.addDealers(dealerIds, { transaction: t });
    } else {
      // fallback: create entries in junction table named SalesGroupMembers
      const rows = dealerIds.map((dealerId) => ({
        salesGroupId: newGroup.id,
        dealerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      if (rows.length) {
        await sequelize.getQueryInterface().bulkInsert('SalesGroupMembers', rows, { transaction: t });
      }
    }

    await AuditLog.create(
      {
        userId: req.user.id,
        action: 'MERGE_SALES_GROUPS',
        entity: 'SalesGroup',
        entityId: newGroup.id,
        changes: { groupIds, mergedDealers: dealerIds },
        ipAddress: req.ip,
      },
      { transaction: t }
    );

    await t.commit();
    return res.json({ message: 'Groups merged successfully', newGroup });
  } catch (err) {
    await t.rollback();
    console.error('mergeSalesGroups:', err);
    return res.status(500).json({ error: 'Failed to merge groups' });
  }
};

/**
 * Review Document (approve / reject)
 * Expects body: { action: 'approve'|'reject', remarks }
 */
const reviewDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, remarks } = req.body;

    const document = await Document.findByPk(id);
    if (!document) return res.status(404).json({ error: 'Document not found' });

    const status = action === 'approve' ? 'approved' : 'rejected';

    await document.update({
      status,
      reviewRemarks: remarks ?? document.reviewRemarks,
      reviewedBy: req.user.username ?? req.user.id,
      approvedBy: status === 'approved' ? req.user.id : document.approvedBy,
      approvedAt: status === 'approved' ? new Date() : document.approvedAt,
      rejectionReason: status === 'rejected' ? remarks ?? document.rejectionReason : null,
    });

    await AuditLog.create({
      userId: req.user.id,
      action: `DOCUMENT_${status.toUpperCase()}`,
      entity: 'Document',
      entityId: document.id,
      changes: { status, remarks },
      ipAddress: req.ip,
    });

    return res.json({ message: `Document ${status}`, document });
  } catch (err) {
    console.error('reviewDocument:', err);
    return res.status(500).json({ error: 'Failed to review document' });
  }
};

/**
 * Review Pricing Update (approve / reject)
 * Expects body: { action: 'approve'|'reject', remarks }
 */
const reviewPricingUpdate = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { action, remarks } = req.body;

    const pricing = await PricingUpdate.findByPk(id, { transaction: t });
    if (!pricing) {
      await t.rollback();
      return res.status(404).json({ error: 'Pricing update not found' });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';

    await pricing.update(
      {
        status,
        remarks: remarks ?? pricing.remarks,
        approvedBy: status === 'approved' ? req.user.username ?? req.user.id : pricing.approvedBy,
        approvedAt: status === 'approved' ? new Date() : pricing.approvedAt,
      },
      { transaction: t }
    );

    await AuditLog.create(
      {
        userId: req.user.id,
        action: `PRICING_${status.toUpperCase()}`,
        entity: 'PricingUpdate',
        entityId: pricing.id,
        changes: { status, remarks },
        ipAddress: req.ip,
      },
      { transaction: t }
    );

    await t.commit();
    return res.json({ message: `Pricing ${status}`, pricing });
  } catch (err) {
    await t.rollback();
    console.error('reviewPricingUpdate:', err);
    return res.status(500).json({ error: 'Failed to process pricing update' });
  }
};

/* -------------------------
   User Management handlers
   ------------------------- */

/**
 * Get all users (paginated optional)
 */
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await User.findAndCountAll({
      include: [{ model: Role, as: 'roleDetails' }, { model: Dealer, as: 'dealer' }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    return res.json({
      users: rows,
      total: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    console.error('getAllUsers:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
};

/**
 * Get single user by id
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [{ model: Role, as: 'roleDetails' }, { model: Dealer, as: 'dealer' }],
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (err) {
    console.error('getUserById:', err);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
};

/**
 * Create user (basic validation + permission assumptions)
 * Note: assumes User model handles password hashing in hooks
 */
/**
 * Create user (safe, FK-validated, scope-aware)
 */
const createUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      username,
      email,
      password,
      roleId: rawRoleId,
      regionId: rawRegionId,
      areaId: rawAreaId,
      territoryId: rawTerritoryId,
      dealerId: rawDealerId,
      isActive = true
    } = req.body;

    const roleId = rawRoleId ? (typeof rawRoleId === 'string' ? rawRoleId.trim() : rawRoleId) : null;
    const regionId = rawRegionId ? rawRegionId : null;
    const areaId = rawAreaId ? rawAreaId : null;
    const territoryId = rawTerritoryId ? rawTerritoryId : null;
    const dealerId = rawDealerId ? rawDealerId : null;

    // basic duplicate check
    const existing = await User.findOne({ where: { email }, transaction: t });
    if (existing) {
      await t.rollback();
      return res.status(400).json({ error: 'Email already exists' });
    }

    // role validation
    const targetRole = await Role.findByPk(roleId, { transaction: t });
    if (!targetRole) {
      await t.rollback();
      return res.status(400).json({ error: 'Invalid roleId' });
    }

    const creatorRole = req.user.roleDetails?.name || req.user.role;

    // start with what frontend sent (super_admin must not be overridden)
    let finalRegionId = regionId;
    let finalAreaId = areaId;
    let finalTerritoryId = territoryId;
    let finalDealerId = dealerId;

    // apply scoping ONLY if creator is NOT super_admin/technical_admin
    if (!['super_admin', 'technical_admin'].includes(creatorRole)) {
      if (creatorRole === 'regional_admin' || creatorRole === 'regional_manager') {
        finalRegionId = req.user.regionId || finalRegionId;
      }
      if (creatorRole === 'area_manager') {
        finalRegionId = req.user.regionId || finalRegionId;
        finalAreaId = req.user.areaId || finalAreaId;
      }
      if (creatorRole === 'territory_manager') {
        finalRegionId = req.user.regionId || finalRegionId;
        finalAreaId = req.user.areaId || finalAreaId;
        finalTerritoryId = req.user.territoryId || finalTerritoryId;
      }
      if (['dealer_admin', 'dealer_staff'].includes(creatorRole)) {
        // dealer-level creators can only create dealer staff under their dealer
        finalDealerId = req.user.dealerId;
        finalRegionId = null;
        finalAreaId = null;
        finalTerritoryId = null;
      }
    }

    // Enforce role-specific required/forbidden fields (backend guard)
    const roleName = targetRole.name;
    if (['dealer_admin', 'dealer_staff'].includes(roleName)) {
      // Dealer roles must include a dealerId
      if (!finalDealerId) {
        await t.rollback();
        return res.status(400).json({ error: 'dealerId is required for dealer roles' });
      }
      // Clear region/area/territory for dealer users
      finalRegionId = null;
      finalAreaId = null;
      finalTerritoryId = null;
    } else {
      // Non-dealer roles should NOT have dealerId
      finalDealerId = finalDealerId || null;
    }

    // Validate foreign keys before insert
    if (finalRegionId) {
      const regionExists = await Region.findByPk(finalRegionId, { transaction: t });
      if (!regionExists) {
        await t.rollback();
        return res.status(400).json({ error: 'Invalid regionId' });
      }
    }

    if (finalAreaId) {
      const Area = require('../models').Area;
      const areaExists = await Area.findByPk(finalAreaId, { transaction: t });
      if (!areaExists) {
        await t.rollback();
        return res.status(400).json({ error: 'Invalid areaId' });
      }
    }

    if (finalTerritoryId) {
      const Territory = require('../models').Territory;
      const territoryExists = await Territory.findByPk(finalTerritoryId, { transaction: t });
      if (!territoryExists) {
        await t.rollback();
        return res.status(400).json({ error: 'Invalid territoryId' });
      }
    }

    if (finalDealerId) {
      const DealerModel = require('../models').Dealer;
      const dealerExists = await DealerModel.findByPk(finalDealerId, { transaction: t });
      if (!dealerExists) {
        await t.rollback();
        return res.status(400).json({ error: 'Invalid dealerId' });
      }
    }

    // Create user - ensure 'role' string column is correct (use targetRole.name)
    const user = await User.create(
      {
        username,
        email,
        password, // model hooks should hash
        roleId: targetRole.id,
        role: targetRole.name,
        regionId: finalRegionId,
        areaId: finalAreaId,
        territoryId: finalTerritoryId,
        dealerId: finalDealerId,
        isActive: !!isActive,
      },
      { transaction: t }
    );

    await AuditLog.create(
      {
        userId: req.user.id,
        action: 'CREATE_USER',
        entity: 'User',
        entityId: user.id,
        changes: { username, email, roleId: targetRole.id, regionId: finalRegionId, areaId: finalAreaId, territoryId: finalTerritoryId, dealerId: finalDealerId },
        ipAddress: req.ip,
      },
      { transaction: t }
    );

    await t.commit();
    return res.status(201).json({ message: 'User created', user });
  } catch (err) {
    await t.rollback();
    console.error('createUser error:', err);
    // Provide helpful message for FK problems
    if (err?.original?.constraint && err.original.constraint.includes('region')) {
      return res.status(400).json({ error: 'Foreign key error: region invalid' });
    }
    return res.status(500).json({ error: 'Failed to create user' });
  }
};


/**
 * Update user (safe, FK-validated, scoped)
 */
const updateUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      username,
      email,
      password,
      roleId: rawRoleId,
      dealerId: rawDealerId,
      regionId: rawRegionId,
      areaId: rawAreaId,
      territoryId: rawTerritoryId,
      isActive
    } = req.body;

    const roleId = rawRoleId ? (typeof rawRoleId === 'string' ? rawRoleId.trim() : rawRoleId) : undefined;
    const regionId = rawRegionId !== undefined ? (rawRegionId || null) : undefined;
    const areaId = rawAreaId !== undefined ? (rawAreaId || null) : undefined;
    const territoryId = rawTerritoryId !== undefined ? (rawTerritoryId || null) : undefined;
    const dealerId = rawDealerId !== undefined ? (rawDealerId || null) : undefined;

    const user = await User.findByPk(id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    // If roleId provided, validate it
    let targetRole = null;
    if (roleId !== undefined && roleId !== null && roleId !== '') {
      targetRole = await Role.findByPk(roleId, { transaction: t });
      if (!targetRole) {
        await t.rollback();
        return res.status(400).json({ error: 'Invalid roleId' });
      }
    }

    const creatorRole = req.user.roleDetails?.name || req.user.role;

    // Start with what is provided (do not blindly override if admin is super_admin)
    let finalRegionId = regionId === undefined ? user.regionId : regionId;
    let finalAreaId = areaId === undefined ? user.areaId : areaId;
    let finalTerritoryId = territoryId === undefined ? user.territoryId : territoryId;
    let finalDealerId = dealerId === undefined ? user.dealerId : dealerId;
    let finalRoleId = roleId === undefined ? user.roleId : roleId;

    // Apply creator scoping if creator is not super/technical admin
    if (!['super_admin', 'technical_admin'].includes(creatorRole)) {
      if (creatorRole === 'regional_admin' || creatorRole === 'regional_manager') {
        finalRegionId = req.user.regionId;
      }
      if (creatorRole === 'area_manager') {
        finalAreaId = req.user.areaId;
        finalRegionId = req.user.regionId;
      }
      if (creatorRole === 'territory_manager') {
        finalTerritoryId = req.user.territoryId;
        finalAreaId = req.user.areaId;
        finalRegionId = req.user.regionId;
      }
      if (['dealer_admin', 'dealer_staff'].includes(creatorRole)) {
        finalDealerId = req.user.dealerId;
        finalRegionId = null;
        finalAreaId = null;
        finalTerritoryId = null;
      }
    }

    // If targetRole (new role) is dealer-level, ensure dealerId present
    if (targetRole && ['dealer_admin', 'dealer_staff'].includes(targetRole.name)) {
      if (!finalDealerId) {
        await t.rollback();
        return res.status(400).json({ error: 'dealerId is required for dealer roles' });
      }
      finalRegionId = null;
      finalAreaId = null;
      finalTerritoryId = null;
    }

    // Validate foreign keys
    if (finalRegionId) {
      const regionExists = await Region.findByPk(finalRegionId, { transaction: t });
      if (!regionExists) {
        await t.rollback();
        return res.status(400).json({ error: 'Invalid regionId' });
      }
    }
    if (finalAreaId) {
      const Area = require('../models').Area;
      const areaExists = await Area.findByPk(finalAreaId, { transaction: t });
      if (!areaExists) {
        await t.rollback();
        return res.status(400).json({ error: 'Invalid areaId' });
      }
    }
    if (finalTerritoryId) {
      const Territory = require('../models').Territory;
      const territoryExists = await Territory.findByPk(finalTerritoryId, { transaction: t });
      if (!territoryExists) {
        await t.rollback();
        return res.status(400).json({ error: 'Invalid territoryId' });
      }
    }
    if (finalDealerId) {
      const DealerModel = require('../models').Dealer;
      const dealerExists = await DealerModel.findByPk(finalDealerId, { transaction: t });
      if (!dealerExists) {
        await t.rollback();
        return res.status(400).json({ error: 'Invalid dealerId' });
      }
    }

    // Build payload
    const updatePayload = {};
    if (username !== undefined) updatePayload.username = username;
    if (email !== undefined) updatePayload.email = email;
    if (password !== undefined && String(password).trim()) updatePayload.password = password;
    if (finalRoleId !== undefined) updatePayload.roleId = finalRoleId;
    if (targetRole) updatePayload.role = targetRole.name;
    updatePayload.regionId = finalRegionId;
    updatePayload.areaId = finalAreaId;
    updatePayload.territoryId = finalTerritoryId;
    updatePayload.dealerId = finalDealerId;
    if (isActive !== undefined) updatePayload.isActive = !!isActive;

    // Update
    await user.update(updatePayload, { transaction: t });

    await AuditLog.create({
      userId: req.user.id,
      action: 'UPDATE_USER',
      entity: 'User',
      entityId: user.id,
      changes: updatePayload,
      ipAddress: req.ip,
    }, { transaction: t });

    await t.commit();
    return res.json({ message: 'User updated', user });
  } catch (err) {
    await t.rollback();
    console.error('updateUser error:', err);
    return res.status(500).json({ error: 'Failed to update user' });
  }
};

/**
 * Update user role (lightweight)
 */
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleId } = req.body;

    const role = await Role.findByPk(roleId);
    if (!role) return res.status(400).json({ error: 'Invalid role' });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.update({ roleId });

    await AuditLog.create({
      userId: req.user.id,
      action: 'UPDATE_USER_ROLE',
      entity: 'User',
      entityId: user.id,
      changes: { roleId },
      ipAddress: req.ip,
    });

    return res.json({ message: 'User role updated', user });
  } catch (err) {
    console.error('updateUserRole:', err);
    return res.status(500).json({ error: 'Failed to update user role' });
  }
};

/**
 * Delete user
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.destroy({ where: { id } });

    await AuditLog.create({
      userId: req.user.id,
      action: 'DELETE_USER',
      entity: 'User',
      entityId: id,
      ipAddress: req.ip,
    });

    return res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('deleteUser:', err);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
};

/**
 * Admin dashboard / report
 */
const getAdminReport = async (req, res) => {
  try {
    // ---------- KPIs ----------
    const totalUsers = await User.count();
    const totalRoles = await Role.count();
    const totalDealers = await Dealer.count();
    const totalDocuments = await Document.count();
    const totalPricingUpdates = await PricingUpdate.count();

    const pendingDocuments = await Document.count({ where: { status: "pending" } });
    const approvedDocuments = await Document.count({ where: { status: "approved" } });
    const rejectedDocuments = await Document.count({ where: { status: "rejected" } });

    const pendingPricing = await PricingUpdate.count({ where: { status: "pending" } });
    const approvedPricing = await PricingUpdate.count({ where: { status: "approved" } });
    const rejectedPricing = await PricingUpdate.count({ where: { status: "rejected" } });


    // ---------- User Growth ----------
    const userGrowth = await User.findAll({
      attributes: [
        [fn("to_char", col("createdAt"), "Mon YYYY"), "month"],
        [fn("count", col("id")), "count"],
      ],
      group: [literal("month")],
      order: [[literal("month"), "ASC"]],
      limit: 12
    });


    // ---------- Documents Per Month ----------
    const docsPerMonth = await Document.findAll({
      attributes: [
        [fn("to_char", col("createdAt"), "Mon YYYY"), "month"],
        [fn("count", col("id")), "count"],
      ],
      group: [literal("month")],
      order: [[literal("month"), "ASC"]],
      limit: 12
    });

// ---------- Dealer Distribution By Region ----------
// ---------- Dealer Distribution By Region ----------
const dealerDistribution = await Region.findAll({
  attributes: [
    "id",
    "name",
    [sequelize.fn("COUNT", sequelize.col("dealers.id")), "count"]
  ],
  include: [
    {
      model: Dealer,
      as: "dealers",      // ⭐ ensure this matches your association alias
      attributes: [],
      required: false     // LEFT JOIN → includes regions with 0 dealers
    }
  ],
  group: ["Region.id"],
  order: [["name", "ASC"]]
});

// Add "Unassigned" region (dealers with null regionId)
const unassignedDealers = await Dealer.count({ where: { regionId: null } });

dealerDistribution.push({
  id: null,
  name: "Unassigned",
  count: unassignedDealers
});





    // ---------- Pricing Trend ----------
    const pricingTrend = await PricingUpdate.findAll({
      attributes: [
        [fn("to_char", col("createdAt"), "Mon YYYY"), "month"],
        [fn("count", col("id")), "count"]
      ],
      group: [literal("month")],
      order: [[literal("month"), "ASC"]],
      limit: 12
    });


    // ---------- Recent Activity ----------
    const recentActivity = await AuditLog.findAll({
      limit: 10,
      order: [["timestamp", "DESC"]],

    });


    // ---------- FINAL RESPONSE ----------
    res.json({
      kpis: {
        totalUsers,
        totalRoles,
        totalDealers,
        totalDocuments,
        totalPricingUpdates,

        pendingDocuments,
        approvedDocuments,
        rejectedDocuments,

        pendingPricing,
        approvedPricing,
        rejectedPricing
      },
      charts: {
        userGrowth,
        docsPerMonth,
        dealerDistribution,
        pricingTrend
      },
      recentActivity
    });

  } catch (err) {
    console.error("getAdminReport:", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
};


module.exports = {
  blockDealer,
  verifyDealer,
  mergeSalesGroups,
  reviewDocument,
  reviewPricingUpdate,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserRole,
  deleteUser,
  getAdminReport,
  assignRegion,
};
