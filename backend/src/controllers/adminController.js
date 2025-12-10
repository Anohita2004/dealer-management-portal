const { Dealer, SalesGroup, PricingUpdate, Document, User,Region, AuditLog,Role, sequelize } = require('../models');
const { Op,fn, col, literal } = require('sequelize');

// ✅ Block or unblock dealer with reason
const blockDealer = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked, reason } = req.body;

    const dealer = await Dealer.findByPk(id);
    if (!dealer) return res.status(404).json({ error: 'Dealer not found' });

    await dealer.update({ isBlocked, blockReason: reason });

    await AuditLog.create({
      userId: req.user.id,
      action: isBlocked ? 'BLOCK_DEALER' : 'UNBLOCK_DEALER',
      entity: 'Dealer',
      entityId: dealer.id,
      changes: { isBlocked, reason },
      ipAddress: req.ip
    });

    res.json({ message: `Dealer ${isBlocked ? 'blocked' : 'unblocked'} successfully`, dealer });
  } catch (err) {
    console.error('blockDealer:', err);
    res.status(500).json({ error: 'Failed to update dealer block status' });
  }
};

// ✅ Verify onboarding & license
const verifyDealer = async (req, res) => {
  try {
    const { id } = req.params;
    const { licenseNumber, licenseDocument } = req.body;

    const dealer = await Dealer.findByPk(id);
    if (!dealer) return res.status(404).json({ error: 'Dealer not found' });

    await dealer.update({
      isVerified: true,
      licenseNumber,
      licenseDocument,
      verifiedBy: req.user.username,
      verifiedAt: new Date()
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'VERIFY_DEALER',
      entity: 'Dealer',
      entityId: dealer.id,
      changes: { licenseNumber },
      ipAddress: req.ip
    });

    res.json({ message: 'Dealer verified successfully', dealer });
  } catch (err) {
    console.error('verifyDealer:', err);
    res.status(500).json({ error: 'Failed to verify dealer' });
  }
};

// ✅ Merge or manage sales groups
const mergeSalesGroups = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { groupIds = [], newName, region, description } = req.body;
    if (groupIds.length < 2) return res.status(400).json({ error: 'Need at least two groups to merge' });

    const groups = await SalesGroup.findAll({ where: { id: groupIds }, include: ['dealers'], transaction: t });

    const newGroup = await SalesGroup.create({ name: newName, region, description }, { transaction: t });

    const dealerIds = [...new Set(groups.flatMap(g => g.dealers.map(d => d.id)))];
    await newGroup.addDealers(dealerIds, { transaction: t });

    await AuditLog.create({
      userId: req.user.id,
      action: 'MERGE_SALES_GROUPS',
      entity: 'SalesGroup',
      entityId: newGroup.id,
      changes: { groupIds, mergedDealers: dealerIds },
      ipAddress: req.ip
    }, { transaction: t });

    await t.commit();
    res.json({ message: 'Groups merged successfully', newGroup });
  } catch (err) {
    await t.rollback();
    console.error('mergeSalesGroups:', err);
    res.status(500).json({ error: 'Failed to merge groups' });
  }
};

// ✅ Approve or reject documents
const reviewDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, remarks } = req.body;
    const document = await Document.findByPk(id);
    if (!document) return res.status(404).json({ error: 'Document not found' });

    const status = action === 'approve' ? 'approved' : 'rejected';
    await document.update({ status, reviewRemarks: remarks, reviewedBy: req.user.username });

    await AuditLog.create({
      userId: req.user.id,
      action: `DOCUMENT_${status.toUpperCase()}`,
      entity: 'Document',
      entityId: document.id,
      changes: { status, remarks },
      ipAddress: req.ip
    });

    res.json({ message: `Document ${status} successfully`, document });
  } catch (err) {
    console.error('reviewDocument:', err);
    res.status(500).json({ error: 'Failed to review document' });
  }
};

// ✅ Oversee pricing distribution (approve/reject updates)
const reviewPricingUpdate = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { action, remarks } = req.body;
    const pricing = await PricingUpdate.findByPk(id, { transaction: t });
    if (!pricing) return res.status(404).json({ error: 'Pricing update not found' });

    const status = action === 'approve' ? 'approved' : 'rejected';
    await pricing.update({ status, remarks, approvedBy: req.user.username, approvedAt: new Date() }, { transaction: t });

    await AuditLog.create({
      userId: req.user.id,
      action: `PRICING_${status.toUpperCase()}`,
      entity: 'PricingUpdate',
      entityId: pricing.id,
      changes: { status, remarks },
      ipAddress: req.ip
    }, { transaction: t });

    await t.commit();
    res.json({ message: `Pricing ${status}`, pricing });
  } catch (err) {
    await t.rollback();
    console.error('reviewPricingUpdate:', err);
    res.status(500).json({ error: 'Failed to process pricing update' });
  }
};

// ✅ User management
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ users });
  } catch (err) {
    console.error('getAllUsers:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};
const createUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      username,
      email,
      password,
      roleId,
      dealerId,
      regionId,
      areaId,
      territoryId,
      isActive
    } = req.body;

    // Check for duplicate email
    const existing = await User.findOne({ where: { email }, transaction: t });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    // Get the role being assigned
    const targetRole = await Role.findByPk(roleId, { transaction: t });
    if (!targetRole) return res.status(400).json({ error: "Invalid role" });

    const creatorRole = req.user.roleDetails?.name || req.user.role;

    // Hierarchical constraints based on creator's role
    let validatedRegionId = regionId;
    let validatedAreaId = areaId;
    let validatedTerritoryId = territoryId;
    let validatedDealerId = dealerId;

    if (creatorRole === 'regional_admin') {
      // Regional admin can only create users in their region
      validatedRegionId = req.user.regionId;
      if (targetRole.name === 'regional_admin' || targetRole.name === 'regional_manager') {
        // Only create other regional roles if same region
      } else if (targetRole.name === 'area_manager') {
        validatedAreaId = areaId; // Must be an area in their region
      } else if (targetRole.name === 'territory_manager') {
        validatedTerritoryId = territoryId; // Must be territory in their region
      }
    } else if (creatorRole === 'area_manager') {
      // Area manager can only create users in their area
      validatedAreaId = req.user.areaId;
      if (targetRole.name === 'area_manager' || targetRole.name === 'regional_admin') {
        return res.status(403).json({ error: "Cannot create higher-level admin" });
      }
    } else if (creatorRole === 'territory_manager') {
      // Territory manager can only create territory and dealer staff
      validatedTerritoryId = req.user.territoryId;
      if (!['territory_manager', 'dealer_admin', 'dealer_staff'].includes(targetRole.name)) {
        return res.status(403).json({ error: "Cannot create users above your level" });
      }
    } else if (creatorRole !== 'super_admin') {
      // Dealer admins can only create dealer staff
      if (targetRole.name !== 'dealer_staff') {
        return res.status(403).json({ error: "Dealer admin can only create dealer staff" });
      }
      validatedDealerId = req.user.dealerId;
    }

    const user = await User.create({
      username,
      email,
      password, // assuming hooks handle hashing
      roleId,
      dealerId: dealerId || validatedDealerId || null,
      regionId: validatedRegionId || null,
      areaId: validatedAreaId || null,
      territoryId: validatedTerritoryId || null,
      isActive
    }, { transaction: t });

    await AuditLog.create({
      userId: req.user.id,
      action: "CREATE_USER",
      entity: "User",
      entityId: user.id,
      changes: req.body,
      ipAddress: req.ip
    }, { transaction: t });

    await t.commit();
    res.json({ message: "User created", user });
  } catch (err) {
    await t.rollback();
    console.error("createUser:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
};
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, roleId, dealerId, regionId, isActive, password } = req.body;

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Prepare update payload
    const updatePayload = {
      username,
      email,
      roleId,
      dealerId: dealerId || null,
      regionId: regionId || null,
      isActive
    };

    if (password && password.trim() !== "") {
      updatePayload.password = password; // hashing handled by model hook
    }

    // ---- Update USER ----
    await user.update(updatePayload);

    // ---- NEW: Auto-update dealer region ----
    if (dealerId && regionId) {
      await Dealer.update(
        { regionId },
        { where: { id: dealerId } }
      );
    }

    // ---- Audit Log ----
    await AuditLog.create({
      userId: req.user.id,
      action: "UPDATE_USER",
      entity: "User",
      entityId: id,
      changes: updatePayload,
      ipAddress: req.ip
    });

    res.json({ message: "User updated", user });
  } catch (err) {
    console.error("updateUser:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
};


const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.update({ role });

    await AuditLog.create({
      userId: req.user.id,
      action: 'UPDATE_USER_ROLE',
      entity: 'User',
      entityId: user.id,
      changes: { role },
      ipAddress: req.ip
    });

    res.json({ message: 'User role updated', user });
  } catch (err) {
    console.error('updateUserRole:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.destroy({ where: { id } });

    await AuditLog.create({
      userId: req.user.id,
      action: 'DELETE_USER',
      entity: 'User',
      entityId: id,
      ipAddress: req.ip
    });

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('deleteUser:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};



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

const assignRegion = async (req, res) => {
  try {
    const { id } = req.params;
    const { regionId } = req.body;

    const dealer = await Dealer.findByPk(id);
    if (!dealer) return res.status(404).json({ error: 'Dealer not found' });

    await dealer.update({ regionId });

    res.json({ message: "Region assigned successfully", dealer });
  } catch (err) {
    console.error("assignRegion:", err);
    res.status(500).json({ error: "Failed to assign region" });
  }
};




module.exports = {
  blockDealer,
  verifyDealer,
  mergeSalesGroups,
  reviewDocument,
  reviewPricingUpdate,
  getAllUsers,
  createUser,
  updateUser,
  updateUserRole,
  deleteUser,
  getAdminReport,
  assignRegion,
  
};
