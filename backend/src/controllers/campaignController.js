const { Campaign, AuditLog } = require('../models');
const { Op } = require('sequelize');

const getAllCampaigns = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive, campaignType } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (campaignType) where.campaignType = campaignType;

    const role = req.user.roleDetails?.name || req.user.role;

    // Apply targeting filter based on user's scope
    if (role === 'dealer_admin' || role === 'dealer_staff') {
      where.isActive = true;
      where.startDate = { [Op.lte]: new Date() };
      where.endDate = { [Op.gte]: new Date() };
      
      // Filter by targetAudience - show campaigns targeting this dealer, territory, area, region, or 'all'
      if (req.user.dealerId || req.user.territoryId || req.user.areaId || req.user.regionId) {
        where[Op.or] = [
          { targetAudience: { [Op.contains]: [{ type: 'all' }] } },
          ...(req.user.dealerId ? [{ targetAudience: { [Op.contains]: [{ type: 'dealer', entityId: req.user.dealerId }] } }] : []),
          ...(req.user.territoryId ? [{ targetAudience: { [Op.contains]: [{ type: 'territory', entityId: req.user.territoryId }] } }] : []),
          ...(req.user.areaId ? [{ targetAudience: { [Op.contains]: [{ type: 'area', entityId: req.user.areaId }] } }] : []),
          ...(req.user.regionId ? [{ targetAudience: { [Op.contains]: [{ type: 'region', entityId: req.user.regionId }] } }] : [])
        ];
      }
    } else if (['territory_manager', 'area_manager', 'regional_manager', 'regional_admin'].includes(role)) {
      // Managers see campaigns targeting their scope
      const targetConditions = [{ targetAudience: { [Op.contains]: [{ type: 'all' }] } }];
      if (req.user.territoryId) targetConditions.push({ targetAudience: { [Op.contains]: [{ type: 'territory', entityId: req.user.territoryId }] } });
      if (req.user.areaId) targetConditions.push({ targetAudience: { [Op.contains]: [{ type: 'area', entityId: req.user.areaId }] } });
      if (req.user.regionId) targetConditions.push({ targetAudience: { [Op.contains]: [{ type: 'region', entityId: req.user.regionId }] } });
      where[Op.or] = targetConditions;
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
    const { targetAudience, ...campaignData } = req.body;
    
    // Normalize targetAudience - ensure it's an array of {type, entityId} objects
    let normalizedTargetAudience = [];
    if (targetAudience) {
      if (Array.isArray(targetAudience)) {
        normalizedTargetAudience = targetAudience;
      } else if (typeof targetAudience === 'object') {
        // Support single target: {type: 'region', entityId: '...'}
        normalizedTargetAudience = [targetAudience];
      }
    } else {
      // Default to 'all' if not specified
      normalizedTargetAudience = [{ type: 'all' }];
    }

    const campaign = await Campaign.create({
      ...campaignData,
      targetAudience: normalizedTargetAudience,
      approvalStage: 'area_manager', // First stage
      approvalStatus: 'pending'
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'CREATE_CAMPAIGN',
      entity: 'Campaign',
      entityId: campaign.id,
      changes: { ...campaignData, targetAudience: normalizedTargetAudience },
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

// Campaign Analytics
const getCampaignAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const campaign = await Campaign.findByPk(id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const { Order, Invoice, Dealer, sequelize } = require('../models');
    const dateFilter = {};
    if (startDate) dateFilter[Op.gte] = new Date(startDate);
    if (endDate) dateFilter[Op.lte] = new Date(endDate);

    // Get orders/invoices during campaign period
    const campaignStart = campaign.startDate;
    const campaignEnd = campaign.endDate;

    // Build dealer filter from targetAudience
    const dealerWhere = {};
    if (campaign.targetAudience && Array.isArray(campaign.targetAudience)) {
      const conditions = [];
      if (campaign.targetAudience.some(t => t.type === 'all')) {
        // All dealers
      } else {
        const regionIds = campaign.targetAudience.filter(t => t.type === 'region').map(t => t.entityId);
        const areaIds = campaign.targetAudience.filter(t => t.type === 'area').map(t => t.entityId);
        const territoryIds = campaign.targetAudience.filter(t => t.type === 'territory').map(t => t.entityId);
        const dealerIds = campaign.targetAudience.filter(t => t.type === 'dealer').map(t => t.entityId);
        
        if (regionIds.length) conditions.push({ regionId: { [Op.in]: regionIds } });
        if (areaIds.length) conditions.push({ areaId: { [Op.in]: areaIds } });
        if (territoryIds.length) conditions.push({ territoryId: { [Op.in]: territoryIds } });
        if (dealerIds.length) conditions.push({ id: { [Op.in]: dealerIds } });
        
        if (conditions.length) dealerWhere[Op.or] = conditions;
      }
    }

    // Participation: dealers who placed orders during campaign
    const participatingDealers = await Dealer.findAll({
      include: [{
        model: Order,
        as: 'orders',
        where: {
          createdAt: { [Op.between]: [campaignStart, campaignEnd] },
          status: { [Op.in]: ['Approved', 'Processing', 'Shipped', 'Delivered'] }
        },
        required: false
      }],
      where: Object.keys(dealerWhere).length > 0 ? dealerWhere : {}
    });

    const participationCount = participatingDealers.filter(d => d.orders?.length > 0).length;
    // Calculate revenue from invoices for targeted dealers
    const invoiceDealerWhere = {};
    if (campaign.targetAudience && Array.isArray(campaign.targetAudience)) {
      if (!campaign.targetAudience.some(t => t.type === 'all')) {
        const regionIds = campaign.targetAudience.filter(t => t.type === 'region').map(t => t.entityId);
        const areaIds = campaign.targetAudience.filter(t => t.type === 'area').map(t => t.entityId);
        const territoryIds = campaign.targetAudience.filter(t => t.type === 'territory').map(t => t.entityId);
        const dealerIds = campaign.targetAudience.filter(t => t.type === 'dealer').map(t => t.entityId);
        
        const conditions = [];
        if (regionIds.length) conditions.push({ regionId: { [Op.in]: regionIds } });
        if (areaIds.length) conditions.push({ areaId: { [Op.in]: areaIds } });
        if (territoryIds.length) conditions.push({ territoryId: { [Op.in]: territoryIds } });
        if (dealerIds.length) conditions.push({ id: { [Op.in]: dealerIds } });
        
        if (conditions.length) invoiceDealerWhere[Op.or] = conditions;
      }
    }

    const invoices = await Invoice.findAll({
      where: {
        invoiceDate: { [Op.between]: [campaignStart, campaignEnd] }
      },
      include: [{
        model: Dealer,
        as: 'dealer',
        where: Object.keys(invoiceDealerWhere).length > 0 ? invoiceDealerWhere : {},
        required: true
      }]
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

    res.json({
      campaignId: campaign.id,
      campaignName: campaign.campaignName,
      participation: {
        totalTargeted: participatingDealers.length,
        participated: participationCount,
        participationRate: participatingDealers.length > 0 ? (participationCount / participatingDealers.length * 100).toFixed(2) : 0
      },
      revenue: {
        total: Number(totalRevenue),
        attributed: Number(totalRevenue * (campaign.discountPercentage / 100 || 0))
      },
      period: {
        start: campaign.startDate,
        end: campaign.endDate
      }
    });
  } catch (error) {
    console.error('Campaign analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign analytics' });
  }
};

module.exports = {
  getAllCampaigns,
  getActiveCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignAnalytics
};
