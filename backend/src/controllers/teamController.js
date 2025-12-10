// src/controllers/teamController.js
const { SalesGroup, Dealer, User, sequelize } = require('../models');

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
    const userRole = req.user.roleDetails?.name || req.user.role;

    // Apply scoping
    if (userRole === 'regional_admin') {
      whereClause.region = req.user.regionId;
    } else if (userRole === 'area_manager' || userRole === 'territory_manager') {
      // Get teams from user's region
      whereClause.region = req.user.regionId;
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

    res.json({ teams });
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
  const { Order, Invoice, sequelize } = require('../models');
  const { Op, fn, col, literal } = sequelize;

  // Get team dealers
  const team = await SalesGroup.findByPk(teamId, {
    include: [{ model: Dealer, as: 'dealers', attributes: ['id'] }]
  });

  if (!team || !team.dealers) return { totalDealers: 0, totalOrders: 0, totalRevenue: 0 };

  const dealerIds = team.dealers.map(d => d.id);

  // Calculate stats
  const [result] = await sequelize.query(`
    SELECT
      COUNT(DISTINCT o.id) as totalOrders,
      COALESCE(SUM(i.totalAmount), 0) as totalRevenue,
      COUNT(DISTINCT d.id) as totalDealers
    FROM dealers d
    LEFT JOIN orders o ON o.dealerId = d.id
    LEFT JOIN invoices i ON i.dealerId = d.id AND i.invoiceDate >= CURRENT_DATE - INTERVAL '30 days'
    WHERE d.id IN (?)
  `, {
    replacements: [dealerIds]
  });

  return result[0];
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
