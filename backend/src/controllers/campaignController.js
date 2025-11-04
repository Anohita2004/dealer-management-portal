const { Campaign, AuditLog } = require('../models');
const { Op } = require('sequelize');

const getAllCampaigns = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive, campaignType } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (campaignType) where.campaignType = campaignType;

    if (req.user.role === 'dealer') {
      where.isActive = true;
      where.startDate = { [Op.lte]: new Date() };
      where.endDate = { [Op.gte]: new Date() };
    }

    const { count, rows } = await Campaign.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['startDate', 'DESC']]
    });

    res.json({
      campaigns: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
};
// Get active campaigns
const getActiveCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.findAll({
      where: { isActive: true },
      order: [["createdAt", "DESC"]],
    });
    res.status(200).json(campaigns);
  } catch (error) {
    console.error("Error fetching active campaigns:", error);
    res.status(500).json({ error: "Failed to fetch active campaigns" });
  }
};

const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findByPk(id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
};

const createCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.create(req.body);

    await AuditLog.create({
      userId: req.user.id,
      action: 'CREATE_CAMPAIGN',
      entity: 'Campaign',
      entityId: campaign.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json(campaign);
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
};

const updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findByPk(id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const oldData = campaign.toJSON();
    await campaign.update(req.body);

    await AuditLog.create({
      userId: req.user.id,
      action: 'UPDATE_CAMPAIGN',
      entity: 'Campaign',
      entityId: campaign.id,
      changes: { old: oldData, new: req.body },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json(campaign);
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
};

const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findByPk(id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    await campaign.destroy();

    await AuditLog.create({
      userId: req.user.id,
      action: 'DELETE_CAMPAIGN',
      entity: 'Campaign',
      entityId: campaign.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
};

module.exports = {
  getAllCampaigns,
  getActiveCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign
};
