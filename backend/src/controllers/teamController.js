// src/controllers/teamController.js
const { SalesGroup, Dealer, User, Invoice, Order, Campaign, sequelize } = require('../models');
const { Op } = require('sequelize');
const RBACEngine = require('../services/rbacEngine');

// Create new team/sales group
const createTeam = async (req, res) => {
  try {
    const { name, region, description, metadata } = req.body;

    // Check permissions
    const userRole = req.user.roleDetails?.name || req.user.role;
    if (userRole === 'regional_admin' && region !== req.user.regionId) {
      return res.status(403).json({ error: 'Cannot create teams outside your region' });
    } else if (userRole === 'area_manager') {
      return res.status(403).json({ error: 'Area managers cannot create teams' });
    }

    const team = await SalesGroup.create({
      name,
      region,
      description,
      metadata: metadata || {}
    });

    res.status(201).json({ message: 'Team created successfully', team });
  } catch (err) {
    console.error('createTeam:', err);
    res.status(500).json({ error: 'Failed to create team' });
  }
};

// Get teams (scoped by user role)
const getTeams = async (req, res) => {
  try {
    const whereClause = {};
    const scope = RBACEngine.getUserScope(req.user);

    // Apply scoping based on user's hierarchy
    if (scope.regionId) {
      whereClause.regionId = scope.regionId;
    }

    const teams = await SalesGroup.findAll({
      where: whereClause,
      include: [
        {
          model: Dealer,
          as: 'dealers',
          attributes: ['id', 'businessName', 'dealerCode', 'lat', 'lng'],
          through: { attributes: [] } // Don't include junction table attributes
        }
      ],
      order: [['name', 'ASC']]
    });

    // Calculate performance for each team
    const teamsWithStats = await Promise.all(
      teams.map(async (team) => {
        const stats = await calculateTeamStats(team.id);
        return {
          ...team.toJSON(),
          stats
        };
      })
    );

    res.json({ teams: teamsWithStats });
  } catch (err) {
    console.error('getTeams:', err);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
};

// Get single team with details
const getTeam = async (req, res) => {
  try {
    const { id } = req.params;

    const team = await SalesGroup.findByPk(id, {
      include: [
        {
          model: Dealer,
          as: 'dealers',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          }],
          through: { attributes: [] }
        }
      ]
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check permissions
    const userRole = req.user.roleDetails?.name || req.user.role;
    if (userRole === 'regional_admin' && team.region !== req.user.regionId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Add performance stats
    const stats = await calculateTeamStats(team.id);
    team.setDataValue('stats', stats);

    res.json({ team });
  } catch (err) {
    console.error('getTeam:', err);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
};

// Add dealer to team
const addDealerToTeam = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { teamId } = req.params;
    const { dealerId } = req.body;

    const team = await SalesGroup.findByPk(teamId, { transaction: t });
    const dealer = await Dealer.findByPk(dealerId, { transaction: t });

    if (!team || !dealer) {
      return res.status(404).json({ error: 'Team or dealer not found' });
    }

    // Check permissions
    const userRole = req.user.roleDetails?.name || req.user.role;
    if (userRole === 'regional_admin' && team.region !== req.user.regionId) {
      return res.status(403).json({ error: 'Cannot modify teams outside your region' });
    } else if (userRole === 'area_manager') {
      // Area managers can only add dealers from their area
      if (dealer.areaId !== req.user.areaId) {
        return res.status(403).json({ error: 'Cannot add dealers from other areas' });
      }
    }

    // Check if dealer is already in another team
    const existingAssociation = await sequelize.models.SalesGroupMembers.findOne({
      where: { dealerId },
      transaction: t
    });

    if (existingAssociation) {
      return res.status(400).json({ error: 'Dealer is already in another team' });
    }

    await team.addDealer(dealerId, { transaction: t });
    await t.commit();

    res.json({ message: 'Dealer added to team successfully' });
  } catch (err) {
    await t.rollback();
    console.error('addDealerToTeam:', err);
    res.status(500).json({ error: 'Failed to add dealer to team' });
  }
};

// Remove dealer from team
const removeDealerFromTeam = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { teamId, dealerId } = req.params;

    const team = await SalesGroup.findByPk(teamId, { transaction: t });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check permissions
    const userRole = req.user.roleDetails?.name || req.user.role;
    if (userRole === 'regional_admin' && team.region !== req.user.regionId) {
      return res.status(403).json({ error: 'Cannot modify teams outside your region' });
    }

    await team.removeDealer(dealerId, { transaction: t });
    await t.commit();

    res.json({ message: 'Dealer removed from team successfully' });
  } catch (err) {
    await t.rollback();
    console.error('removeDealerFromTeam:', err);
    res.status(500).json({ error: 'Failed to remove dealer from team' });
  }
};

// Update team
const updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, metadata } = req.body;

    const team = await SalesGroup.findByPk(id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check permissions
    const userRole = req.user.roleDetails?.name || req.user.role;
    if (userRole === 'regional_admin' && team.region !== req.user.regionId) {
      return res.status(403).json({ error: 'Cannot modify teams outside your region' });
    } else if (userRole === 'area_manager') {
      return res.status(403).json({ error: 'Area managers cannot modify teams' });
    }

    await team.update({
      name: name || team.name,
      description: description || team.description,
      metadata: metadata || team.metadata
    });

    res.json({ message: 'Team updated successfully', team });
  } catch (err) {
    console.error('updateTeam:', err);
    res.status(500).json({ error: 'Failed to update team' });
  }
};

// Delete team
const deleteTeam = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const team = await SalesGroup.findByPk(id, {
      include: [{ model: Dealer, as: 'dealers', through: { attributes: [] } }],
      transaction: t
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Check permissions
    const userRole = req.user.roleDetails?.name || req.user.role;
    if (userRole === 'regional_admin' && team.region !== req.user.regionId) {
      return res.status(403).json({ error: 'Cannot delete teams outside your region' });
    }

    // Remove all dealers from team first
    await team.setDealers([], { transaction: t });

    await team.destroy({ transaction: t });
    await t.commit();

    res.json({ message: 'Team deleted successfully' });
  } catch (err) {
    await t.rollback();
    console.error('deleteTeam:', err);
    res.status(500).json({ error: 'Failed to delete team' });
  }
};

// Helper function to calculate team performance stats
const calculateTeamStats = async (teamId) => {
  // Get team dealers
  const team = await SalesGroup.findByPk(teamId, {
    include: [{ model: Dealer, as: 'dealers', attributes: ['id'] }]
  });

  if (!team || !team.dealers || team.dealers.length === 0) {
    return {
      totalDealers: 0,
      totalOrders: 0,
      totalRevenue: 0,
      monthlyRevenue: 0,
      outstandingAmount: 0,
      activeCampaigns: 0
    };
  }

  const dealerIds = team.dealers.map(d => d.id);

  // Calculate comprehensive stats
  const totalOrders = await Order.count({
    where: { dealerId: { [Op.in]: dealerIds } }
  });

  const totalRevenue = await Invoice.sum('totalAmount', {
    where: { dealerId: { [Op.in]: dealerIds } }
  }) || 0;

  const monthlyRevenue = await Invoice.sum('totalAmount', {
    where: {
      dealerId: { [Op.in]: dealerIds },
      invoiceDate: {
        [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1))
      }
    }
  }) || 0;

  const outstandingAmount = await Invoice.sum('balanceAmount', {
    where: {
      dealerId: { [Op.in]: dealerIds },
      balanceAmount: { [Op.gt]: 0 }
    }
  }) || 0;

  // Get active campaigns targeting team dealers
  const activeCampaigns = await Campaign.count({
    where: {
      isActive: true,
      targetAudience: {
        [Op.contains]: dealerIds.map(id => ({ type: 'dealer', entityId: id }))
      }
    }
  });

  return {
    totalDealers: dealerIds.length,
    totalOrders,
    totalRevenue: Number(totalRevenue),
    monthlyRevenue: Number(monthlyRevenue),
    outstandingAmount: Number(outstandingAmount),
    activeCampaigns
  };
};

module.exports = {
  createTeam,
  getTeams,
  getTeam,
  addDealerToTeam,
  removeDealerFromTeam,
  updateTeam,
  deleteTeam
};
