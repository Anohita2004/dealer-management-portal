// src/controllers/territoryController.js
const { Territory, Area, Region, Dealer, User, sequelize } = require('../models');

// Create new territory
const createTerritory = async (req, res) => {
  try {
    const { name, areaId, geojson, centroidLat, centroidLng } = req.body;

    // Validate area exists and check permissions
    const area = await Area.findByPk(areaId);
    if (!area) {
      return res.status(404).json({ error: 'Area not found' });
    }

    // Check hierarchical permissions
    const userRole = req.user.roleDetails?.name || req.user.role;
    if (userRole === 'area_manager' && req.user.areaId !== areaId) {
      return res.status(403).json({ error: 'Cannot create territories outside your area' });
    } else if (userRole === 'regional_admin' && area.regionId !== req.user.regionId) {
      return res.status(403).json({ error: 'Cannot create territories in areas outside your region' });
    }

    const territory = await Territory.create({
      name,
      areaId,
      geojson,
      centroidLat,
      centroidLng
    });

    res.status(201).json({ message: 'Territory created successfully', territory });
  } catch (err) {
    console.error('createTerritory:', err);
    res.status(500).json({ error: 'Failed to create territory' });
  }
};

// Get territories (scoped by user role)
const getTerritories = async (req, res) => {
  try {
    const whereClause = {};
    const userRole = req.user.roleDetails?.name || req.user.role;

    // Apply scoping
    if (userRole === 'area_manager') {
      whereClause.areaId = req.user.areaId;
    } else if (userRole === 'regional_admin') {
      // Get areas in user's region, then territories in those areas
      const areas = await Area.findAll({
        where: { regionId: req.user.regionId },
        attributes: ['id']
      });
      const areaIds = areas.map(a => a.id);
      whereClause.areaId = { [require('sequelize').Op.in]: areaIds };
    }

    const territories = await Territory.findAll({
      where: whereClause,
      include: [
        {
          model: Area,
          as: 'area',
          attributes: ['id', 'name'],
          include: [{
            model: Region,
            as: 'region',
            attributes: ['id', 'name']
          }]
        },
        {
          model: Dealer,
          as: 'dealers',
          attributes: ['id', 'businessName', 'dealerCode']
        }
      ],
      order: [['name', 'ASC']]
    });

    res.json({ territories });
  } catch (err) {
    console.error('getTerritories:', err);
    res.status(500).json({ error: 'Failed to fetch territories' });
  }
};

// Get single territory
const getTerritory = async (req, res) => {
  try {
    const { id } = req.params;

    const territory = await Territory.findByPk(id, {
      include: [
        {
          model: Area,
          as: 'area',
          include: [{
            model: Region,
            as: 'region'
          }]
        },
        {
          model: Dealer,
          as: 'dealers',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          }]
        }
      ]
    });

    if (!territory) {
      return res.status(404).json({ error: 'Territory not found' });
    }

    // Check permissions
    const userRole = req.user.roleDetails?.name || req.user.role;
    if (userRole === 'area_manager' && territory.areaId !== req.user.areaId) {
      return res.status(403).json({ error: 'Access denied' });
    } else if (userRole === 'regional_admin' && territory.area?.regionId !== req.user.regionId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ territory });
  } catch (err) {
    console.error('getTerritory:', err);
    res.status(500).json({ error: 'Failed to fetch territory' });
  }
};

// Update territory
const updateTerritory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, geojson, centroidLat, centroidLng } = req.body;

    const territory = await Territory.findByPk(id);
    if (!territory) {
      return res.status(404).json({ error: 'Territory not found' });
    }

    // Check permissions
    const userRole = req.user.roleDetails?.name || req.user.role;
    if (userRole === 'area_manager' && territory.areaId !== req.user.areaId) {
      return res.status(403).json({ error: 'Cannot modify territories outside your area' });
    } else if (userRole === 'regional_admin' && territory.area?.regionId !== req.user.regionId) {
      return res.status(403).json({ error: 'Cannot modify territories outside your region' });
    }

    await territory.update({
      name: name || territory.name,
      geojson: geojson || territory.geojson,
      centroidLat: centroidLat || territory.centroidLat,
      centroidLng: centroidLng || territory.centroidLng
    });

    res.json({ message: 'Territory updated successfully', territory });
  } catch (err) {
    console.error('updateTerritory:', err);
    res.status(500).json({ error: 'Failed to update territory' });
  }
};

// Delete territory (with validation)
const deleteTerritory = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const territory = await Territory.findByPk(id, {
      include: [
        { model: Dealer, as: 'dealers' },
        {
          model: Area,
          as: 'area',
          include: [{ model: Region, as: 'region' }]
        }
      ],
      transaction: t
    });

    if (!territory) {
      return res.status(404).json({ error: 'Territory not found' });
    }

    // Check if territory has dealers
    if (territory.dealers && territory.dealers.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete territory that contains dealers. Move dealers first.'
      });
    }

    // Check permissions
    const userRole = req.user.roleDetails?.name || req.user.role;
    if (userRole === 'area_manager' && territory.areaId !== req.user.areaId) {
      return res.status(403).json({ error: 'Cannot delete territories outside your area' });
    } else if (userRole === 'regional_admin' && territory.area?.regionId !== req.user.regionId) {
      return res.status(403).json({ error: 'Cannot delete territories outside your region' });
    }

    await territory.destroy({ transaction: t });
    await t.commit();

    res.json({ message: 'Territory deleted successfully' });
  } catch (err) {
    await t.rollback();
    console.error('deleteTerritory:', err);
    res.status(500).json({ error: 'Failed to delete territory' });
  }
};

module.exports = {
  createTerritory,
  getTerritories,
  getTerritory,
  updateTerritory,
  deleteTerritory
};
