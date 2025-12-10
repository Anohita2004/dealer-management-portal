const { Op } = require('sequelize');

const rolesToScope = {
  'regional_admin': scopeToRegion,
  'regional_manager': scopeToRegion,
  'area_manager': scopeToArea,
  'territory_manager': scopeToTerritory,
  'dealer_admin': scopeToDealer,
  'dealer_staff': scopeToDealer,
};

// Super Admin: No scoping - sees everything
// Technical Admin: No scoping - but limited by permissions (not by data)

function scopeToRegion(user) {
  return {
    regionId: user.regionId
  };
}

function scopeToArea(user) {
  return {
    areaId: user.areaId
  };
}

function scopeToTerritory(user) {
  return {
    territoryId: user.territoryId
  };
}

function scopeToDealer(user) {
  return {
    id: user.dealerId // Dealers only see themselves
  };
}

/**
 * Middleware to apply hierarchical data scoping
 * @param {string[]} entityTypes - Array of entities like ['Order', 'Dealer', 'Invoice']
 * @returns Middleware function that adds whereClause to req.scope
 */
function applyScoping(entityTypes = []) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next();
      }

      const roleName = req.user.roleDetails?.name || req.user.role;

      // Super Admin & Technical Admin see all
      if (['super_admin', 'technical_admin'].includes(roleName)) {
        return next();
      }

      const scopingFn = rolesToScope[roleName];
      if (!scopingFn) {
        return next();
      }

      const scopeWhere = scopingFn(req.user);

      // For different entity types, apply appropriate where clauses
      req.scope = {};

      for (const entityType of entityTypes) {
        if (entityType === 'Dealer') {
          req.scope.dealers = { ...scopeWhere };
        } else if (entityType === 'Order') {
          // Orders belong to dealers, so scope by dealer's hierarchy
          if (scopeWhere.id) {
            // Dealer level
            req.scope.orders = { dealerId: req.user.dealerId };
          } else {
            // Manager level - need to get dealers under their scope
            const dealersUnderScope = await getDealersUnderUserScope(req.user);
            req.scope.orders = { dealerId: { [Op.in]: dealersUnderScope } };
          }
        } else if (entityType === 'Invoice') {
          // Similar to orders
          if (scopeWhere.id) {
            req.scope.invoices = { dealerId: req.user.dealerId };
          } else {
            const dealersUnderScope = await getDealersUnderUserScope(req.user);
            req.scope.invoices = { dealerId: { [Op.in]: dealersUnderScope } };
          }
        } else if (entityType === 'Campaign') {
          // Campaigns can target regions/territories, but viewing is scoped
          // This might need more complex logic
          req.scope.campaigns = getCampaignScopeForUser(req.user);
        }
      }

      next();
    } catch (err) {
      console.error('Scoping middleware error:', err);
      res.status(500).json({ error: 'Scope check failed' });
    }
  };
}

/**
 * Get all dealer IDs under a user's hierarchical scope
 */
async function getDealersUnderUserScope(user) {
  const { Dealer, Territory, Area, Region } = require('../models');
  let dealerIds = [];

  const roleName = user.roleDetails?.name || user.role;

  if (roleName === 'regional_admin' || roleName === 'regional_manager') {
    // Get all dealers in their region
    const dealers = await Dealer.findAll({
      where: { regionId: user.regionId },
      attributes: ['id']
    });
    dealerIds = dealers.map(d => d.id);
  } else if (roleName === 'area_manager') {
    // Get all dealers in their area
    const dealers = await Dealer.findAll({
      where: { areaId: user.areaId },
      attributes: ['id']
    });
    dealerIds = dealers.map(d => d.id);
  } else if (roleName === 'territory_manager') {
    // Get all dealers in their territory
    dealerIds = await Dealer.findAll({
      where: { territoryId: user.territoryId },
      attributes: ['id']
    });
    dealerIds = dealerIds.map(d => d.id);
  } else if (roleName === 'dealer_admin') {
    // Dealers under this dealer admin (might have sub-dealers, but for now just self)
    dealerIds = [user.dealerId];
  } else if (roleName === 'dealer_staff') {
    // Only their own dealer
    dealerIds = [user.dealerId];
  }

  return dealerIds;
}

/**
 * Get scope for campaigns based on user role
 */
function getCampaignScopeForUser(user) {
  const roleName = user.roleDetails?.name || user.role;

  // For managers, only see campaigns targeted to their scope
  if (roleName === 'regional_admin' || roleName === 'regional_manager') {
    return {
      [Op.or]: [
        { targetAudience: { [Op.contains]: [{ type: 'region', entityId: user.regionId }] } },
        { targetAudience: { [Op.contains]: [{ type: 'all' }] } }
      ]
    };
  } else if (roleName === 'area_manager') {
    return {
      [Op.or]: [
        { targetAudience: { [Op.contains]: [{ type: 'area', entityId: user.areaId }] } },
        { targetAudience: { [Op.contains]: [{ type: 'region', entityId: user.regionId }] } },
        { targetAudience: { [Op.contains]: [{ type: 'all' }] } }
      ]
    };
  } else if (roleName === 'territory_manager') {
    return {
      [Op.or]: [
        { targetAudience: { [Op.contains]: [{ type: 'territory', entityId: user.territoryId }] } },
        { targetAudience: { [Op.contains]: [{ type: 'area', entityId: user.areaId }] } },
        { targetAudience: { [Op.contains]: [{ type: 'region', entityId: user.regionId }] } },
        { targetAudience: { [Op.contains]: [{ type: 'all' }] } }
      ]
    };
  } else if (roleName.startsWith('dealer_')) {
    return {
      [Op.or]: [
        { targetAudience: { [Op.contains]: [{ type: 'dealer', entityId: user.dealerId }] } },
        { targetAudience: { [Op.contains]: [{ type: 'territory', entityId: user.territoryId }] } },
        { targetAudience: { [Op.contains]: [{ type: 'area', entityId: user.areaId }] } },
        { targetAudience: { [Op.contains]: [{ type: 'region', entityId: user.regionId }] } },
        { targetAudience: { [Op.contains]: [{ type: 'all' }] } }
      ]
    };
  }

  return {};
}

module.exports = {
  applyScoping,
  getDealersUnderUserScope
};
