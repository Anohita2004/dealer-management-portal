// src/services/rbacEngine.js
// Centralized RBAC Engine with Hierarchical Scoping
// Combines: Role + Permission + Region + Area + Territory + Dealer

const { User, Role, Permission, Dealer, Region, Area, Territory, UserDealer } = require('../models');
const { Op } = require('sequelize');

/**
 * RBAC Engine - Centralized authorization and scoping
 */
class RBACEngine {
  /**
   * Check if user has a specific permission
   * @param {Object} user - User object with roleId
   * @param {string} permissionKey - Permission key to check
   * @returns {Promise<boolean>}
   */
  static async hasPermission(user, permissionKey) {
    if (!user || !user.roleId) return false;

    // Super admin has all permissions
    const role = await Role.findByPk(user.roleId, {
      include: [{
        model: Permission,
        as: 'permissions',
        where: { key: permissionKey },
        through: { attributes: [] }
      }]
    });

    if (!role) return false;

    // Check if role is super_admin
    if (role.name === 'super_admin') return true;

    // Check if role has the permission
    return role.permissions && role.permissions.length > 0;
  }

  /**
   * Check if user has any of the specified permissions
   * @param {Object} user - User object
   * @param {string[]} permissionKeys - Array of permission keys
   * @returns {Promise<boolean>}
   */
  static async hasAnyPermission(user, permissionKeys) {
    if (!user || !user.roleId) return false;
    if (permissionKeys.length === 0) return true;

    const role = await Role.findByPk(user.roleId, {
      include: [{
        model: Permission,
        as: 'permissions',
        where: { key: { [Op.in]: permissionKeys } },
        through: { attributes: [] }
      }]
    });

    if (!role) return false;
    if (role.name === 'super_admin') return true;

    return role.permissions && role.permissions.length > 0;
  }

  /**
   * Check if user has all of the specified permissions
   * @param {Object} user - User object
   * @param {string[]} permissionKeys - Array of permission keys
   * @returns {Promise<boolean>}
   */
  static async hasAllPermissions(user, permissionKeys) {
    if (!user || !user.roleId) return false;
    if (permissionKeys.length === 0) return true;

    const role = await Role.findByPk(user.roleId);
    if (!role) return false;
    if (role.name === 'super_admin') return true;

    const permissions = await Permission.findAll({
      where: { key: { [Op.in]: permissionKeys } },
      include: [{
        model: Role,
        as: 'roles',
        where: { id: user.roleId },
        through: { attributes: [] }
      }]
    });

    return permissions.length === permissionKeys.length;
  }

  /**
   * Get user's scope based on role and hierarchy
   * Returns scope object with regionId, areaId, territoryId, dealerId
   * @param {Object} user - User object with role and hierarchy fields
   * @returns {Object} Scope object
   */
  static getUserScope(user) {
    if (!user) return {};

    const roleName = user.roleDetails?.name || user.role;

    // Super Admin & Technical Admin see all
    if (['super_admin', 'technical_admin'].includes(roleName)) {
      return { all: true };
    }

    const scope = {};

    // Regional level
    if (['regional_admin', 'regional_manager'].includes(roleName)) {
      if (user.regionId) scope.regionId = user.regionId;
    }

    // Area level
    if (roleName === 'area_manager') {
      if (user.areaId) scope.areaId = user.areaId;
      if (user.regionId) scope.regionId = user.regionId; // Area belongs to region
    }

    // Territory level
    if (roleName === 'territory_manager') {
      if (user.territoryId) scope.territoryId = user.territoryId;
      if (user.areaId) scope.areaId = user.areaId;
      if (user.regionId) scope.regionId = user.regionId;
    }

    // Dealer level
    if (roleName.startsWith('dealer_')) {
      if (user.dealerId) scope.dealerId = user.dealerId;
      if (user.territoryId) scope.territoryId = user.territoryId;
      if (user.areaId) scope.areaId = user.areaId;
      if (user.regionId) scope.regionId = user.regionId;
    }

    return scope;
  }

  /**
   * Get all dealer IDs under user's scope
   * @param {Object} user - User object
   * @returns {Promise<Array<string>>} Array of dealer IDs
   */
  static async getDealersInScope(user) {
    if (!user) return [];

    const roleName = user.roleDetails?.name || user.role;

    // Super Admin & Technical Admin see all dealers
    if (['super_admin', 'technical_admin'].includes(roleName)) {
      const allDealers = await Dealer.findAll({ attributes: ['id'] });
      return allDealers.map(d => d.id);
    }

    // Sales Executive: dealers explicitly assigned via mapping
    if (roleName === 'sales_executive') {
      const mappings = await UserDealer.findAll({
        where: { userId: user.id },
        attributes: ['dealerId']
      });
      return mappings.map((m) => m.dealerId);
    }

    const scope = this.getUserScope(user);
    const whereClause = {};

    if (scope.regionId) {
      whereClause.regionId = scope.regionId;
    } else if (scope.areaId) {
      whereClause.areaId = scope.areaId;
    } else if (scope.territoryId) {
      whereClause.territoryId = scope.territoryId;
    } else if (scope.dealerId) {
      return [scope.dealerId];
    }

    const dealers = await Dealer.findAll({
      where: whereClause,
      attributes: ['id']
    });

    return dealers.map(d => d.id);
  }

  /**
   * Get all territory IDs under user's scope
   * @param {Object} user - User object
   * @returns {Promise<Array<string>>} Array of territory IDs
   */
  static async getTerritoriesInScope(user) {
    if (!user) return [];

    const roleName = user.roleDetails?.name || user.role;

    if (['super_admin', 'technical_admin'].includes(roleName)) {
      const allTerritories = await Territory.findAll({ attributes: ['id'] });
      return allTerritories.map(t => t.id);
    }

    const scope = this.getUserScope(user);
    const whereClause = {};

    if (scope.regionId) {
      whereClause.regionId = scope.regionId;
    } else if (scope.areaId) {
      whereClause.areaId = scope.areaId;
    } else if (scope.territoryId) {
      return [scope.territoryId];
    }

    const territories = await Territory.findAll({
      where: whereClause,
      attributes: ['id']
    });

    return territories.map(t => t.id);
  }

  /**
   * Get all area IDs under user's scope
   * @param {Object} user - User object
   * @returns {Promise<Array<string>>} Array of area IDs
   */
  static async getAreasInScope(user) {
    if (!user) return [];

    const roleName = user.roleDetails?.name || user.role;

    if (['super_admin', 'technical_admin'].includes(roleName)) {
      const allAreas = await Area.findAll({ attributes: ['id'] });
      return allAreas.map(a => a.id);
    }

    const scope = this.getUserScope(user);
    const whereClause = {};

    if (scope.regionId) {
      whereClause.regionId = scope.regionId;
    } else if (scope.areaId) {
      return [scope.areaId];
    }

    const areas = await Area.findAll({
      where: whereClause,
      attributes: ['id']
    });

    return areas.map(a => a.id);
  }

  /**
   * Check if user can access a specific resource based on scope
   * @param {Object} user - User object
   * @param {Object} resource - Resource with hierarchy fields (regionId, areaId, territoryId, dealerId)
   * @returns {Promise<boolean>}
   */
  static async canAccessResource(user, resource) {
    if (!user || !resource) return false;

    const roleName = user.roleDetails?.name || user.role;

    // Super Admin & Technical Admin can access all
    if (['super_admin', 'technical_admin'].includes(roleName)) {
      return true;
    }

    const scope = this.getUserScope(user);

    // Check dealer level
    if (resource.dealerId) {
      const dealersInScope = await this.getDealersInScope(user);
      if (!dealersInScope.includes(resource.dealerId)) {
        return false;
      }
    }

    // Check territory level
    if (resource.territoryId) {
      const territoriesInScope = await this.getTerritoriesInScope(user);
      if (!territoriesInScope.includes(resource.territoryId)) {
        return false;
      }
    }

    // Check area level
    if (resource.areaId) {
      const areasInScope = await this.getAreasInScope(user);
      if (!areasInScope.includes(resource.areaId)) {
        return false;
      }
    }

    // Check region level
    if (resource.regionId && scope.regionId) {
      if (resource.regionId !== scope.regionId) {
        return false;
      }
    }

    return true;
  }

  /**
   * Build where clause for Sequelize queries based on user scope
   * @param {Object} user - User object
   * @param {string} entityType - Type of entity ('Order', 'Invoice', 'Dealer', etc.)
   * @returns {Promise<Object>} Sequelize where clause
   */
  static async buildScopeWhereClause(user, entityType) {
    if (!user) return {};

    const roleName = user.roleDetails?.name || user.role;

    // Super Admin & Technical Admin see all
    if (['super_admin', 'technical_admin'].includes(roleName)) {
      return {};
    }

    const scope = this.getUserScope(user);

    // Handle different entity types
    switch (entityType) {
      case 'Order':
      case 'Invoice':
      case 'PaymentRequest':
        // These entities belong to dealers
        const dealerIds = await this.getDealersInScope(user);
        if (dealerIds.length === 0) {
          return { id: { [Op.in]: [] } }; // No access
        }
        return { dealerId: { [Op.in]: dealerIds } };

      case 'Dealer':
        if (scope.dealerId) {
          return { id: scope.dealerId };
        }
        const dealersInScope = await this.getDealersInScope(user);
        if (dealersInScope.length === 0) {
          return { id: { [Op.in]: [] } };
        }
        return { id: { [Op.in]: dealersInScope } };

      case 'Territory':
        const territoryIds = await this.getTerritoriesInScope(user);
        if (territoryIds.length === 0) {
          return { id: { [Op.in]: [] } };
        }
        return { id: { [Op.in]: territoryIds } };

      case 'Area':
        const areaIds = await this.getAreasInScope(user);
        if (areaIds.length === 0) {
          return { id: { [Op.in]: [] } };
        }
        return { id: { [Op.in]: areaIds } };

      case 'Region':
        if (scope.regionId) {
          return { id: scope.regionId };
        }
        return {};

      case 'Campaign':
        // Campaigns have targetAudience field - handled separately
        return {};

      default:
        // Generic fallback - try to match by hierarchy
        const where = {};
        if (scope.dealerId) where.dealerId = scope.dealerId;
        if (scope.territoryId) where.territoryId = scope.territoryId;
        if (scope.areaId) where.areaId = scope.areaId;
        if (scope.regionId) where.regionId = scope.regionId;
        return where;
    }
  }

  /**
   * Check if user can perform action on resource
   * Combines permission check + scope check
   * @param {Object} user - User object
   * @param {string} permissionKey - Permission key
   * @param {Object} resource - Resource to check access for
   * @returns {Promise<boolean>}
   */
  static async canPerformAction(user, permissionKey, resource = null) {
    // First check permission
    const hasPerm = await this.hasPermission(user, permissionKey);
    if (!hasPerm) return false;

    // If no resource specified, permission check is enough
    if (!resource) return true;

    // Check scope access
    return await this.canAccessResource(user, resource);
  }
}

module.exports = RBACEngine;

