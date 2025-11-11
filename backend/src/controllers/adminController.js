const { Dealer, SalesGroup, PricingUpdate, Document, User, AuditLog, sequelize } = require('../models');
const { Op } = require('sequelize');

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

// ✅ Consolidated reporting for dashboard
const getAdminReport = async (req, res) => {
  try {
    const [dealerCount, blockedCount, verifiedCount, docPending, pricePending] = await Promise.all([
      Dealer.count(),
      Dealer.count({ where: { isBlocked: true } }),
      Dealer.count({ where: { isVerified: true } }),
      Document.count({ where: { status: 'pending' } }),
      PricingUpdate.count({ where: { status: 'pending' } })
    ]);

    res.json({
      dealers: { total: dealerCount, blocked: blockedCount, verified: verifiedCount },
      documents: { pending: docPending },
      pricing: { pending: pricePending }
    });
  } catch (err) {
    console.error('getAdminReport:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

module.exports = {
  blockDealer,
  verifyDealer,
  mergeSalesGroups,
  reviewDocument,
  reviewPricingUpdate,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAdminReport
};
