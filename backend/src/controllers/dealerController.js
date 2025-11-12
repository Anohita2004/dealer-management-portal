const { Dealer, User, AuditLog } = require('../models');
const { Op } = require('sequelize');
const { verifyDealer } = require('./adminController');

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

    // ✅ Active/inactive filter
    if (isActive !== undefined) where.isActive = isActive === 'true';

    // 👇 Restrict data visibility for TM / AM users
    if (req.user.role === 'tm' || req.user.role === 'am') {
      if (req.user.region) where.region = req.user.region;
      if (req.user.territory) where.territory = req.user.territory;
    }

    // 📊 Pagination and ordering
    const { count, rows } = await Dealer.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    // 🧾 Response
    res.json({
      dealers: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get dealers error:', error);
    res.status(500).json({ error: 'Failed to fetch dealers' });
  }
};

const getDealerById = async (req, res) => {
  try {
    const { id } = req.params;
    const dealer = await Dealer.findByPk(id);

    if (!dealer) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    res.json(dealer);
  } catch (error) {
    console.error('Get dealer error:', error);
    res.status(500).json({ error: 'Failed to fetch dealer' });
  }
};

const createDealer = async (req, res) => {
  try {
    const dealer = await Dealer.create(req.body);

    await AuditLog.create({
      userId: req.user.id,
      action: 'CREATE_DEALER',
      entity: 'Dealer',
      entityId: dealer.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json(dealer);
  } catch (error) {
    console.error('Create dealer error:', error);
    res.status(500).json({ error: 'Failed to create dealer' });
  }
};

const updateDealer = async (req, res) => {
  try {
    const { id } = req.params;
    const dealer = await Dealer.findByPk(id);

    if (!dealer) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    const oldData = dealer.toJSON();
    await dealer.update(req.body);

    await AuditLog.create({
      userId: req.user.id,
      action: 'UPDATE_DEALER',
      entity: 'Dealer',
      entityId: dealer.id,
      changes: { old: oldData, new: req.body },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json(dealer);
  } catch (error) {
    console.error('Update dealer error:', error);
    res.status(500).json({ error: 'Failed to update dealer' });
  }
};

const blockDealer = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    const dealer = await Dealer.findByPk(id);

    if (!dealer) {
      return res.status(404).json({ error: 'Dealer not found' });
    }

    await dealer.update({ isBlocked });

    await AuditLog.create({
      userId: req.user.id,
      action: isBlocked ? 'BLOCK_DEALER' : 'UNBLOCK_DEALER',
      entity: 'Dealer',
      entityId: dealer.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json(dealer);
  } catch (error) {
    console.error('Block dealer error:', error);
    res.status(500).json({ error: 'Failed to block/unblock dealer' });
  }
};

const getDealerProfile = async (req, res) => {
  try {
    if (req.user.role !== 'dealer') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const dealer = await Dealer.findByPk(req.user.dealerId);

    if (!dealer) {
      return res.status(404).json({ error: 'Dealer profile not found' });
    }

    res.json(dealer);
  } catch (error) {
    console.error('Get dealer profile error:', error);
    res.status(500).json({ error: 'Failed to fetch dealer profile' });
  }
};
exports.verifyDealer = async (req, res) => {
  try {
    const { id } = req.params;
    const dealer = await Dealer.findByPk(id);
    if (!dealer) return res.status(404).json({ error: "Dealer not found" });

    dealer.isVerified = true;
    await dealer.save();

    res.json({ message: "Dealer verified successfully", dealer });
  } catch (error) {
    console.error("verifyDealer error:", error);
    res.status(500).json({ error: "Failed to verify dealer" });
  }
};


module.exports = {
  getAllDealers,
  getDealerById,
  createDealer,
  updateDealer,
  blockDealer,
  getDealerProfile,
  verifyDealer
};
