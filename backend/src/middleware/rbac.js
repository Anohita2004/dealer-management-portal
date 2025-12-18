// src/middleware/rbac.js
// Enhanced RBAC middleware using centralized RBAC engine

const RBACEngine = require('../services/rbacEngine');

/**
 * Middleware to check if user has a specific permission
 * @param {string} permissionKey - Permission key to check
 * @returns {Function} Express middleware
 */
const requirePermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized - No user found' });
      }

      const hasPermission = await RBACEngine.hasPermission(req.user, permissionKey);
      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Access Denied - Missing Permission',
          required: permissionKey
        });
      }

      next();
    } catch (err) {
      console.error('Permission middleware error:', err);
      return res.status(500).json({ error: 'Internal permission validation failed' });
    }
  };
};

/**
 * Middleware to check if user has any of the specified permissions
 * @param {string[]} permissionKeys - Array of permission keys
 * @returns {Function} Express middleware
 */
const requireAnyPermission = (permissionKeys) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized - No user found' });
      }

      const hasPermission = await RBACEngine.hasAnyPermission(req.user, permissionKeys);
      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Access Denied - Missing Required Permission',
          required: permissionKeys
        });
      }

      next();
    } catch (err) {
      console.error('Permission middleware error:', err);
      return res.status(500).json({ error: 'Internal permission validation failed' });
    }
  };
};

/**
 * Middleware to check if user has all of the specified permissions
 * @param {string[]} permissionKeys - Array of permission keys
 * @returns {Function} Express middleware
 */
const requireAllPermissions = (permissionKeys) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized - No user found' });
      }

      const hasPermission = await RBACEngine.hasAllPermissions(req.user, permissionKeys);
      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Access Denied - Missing Required Permissions',
          required: permissionKeys
        });
      }

      next();
    } catch (err) {
      console.error('Permission middleware error:', err);
      return res.status(500).json({ error: 'Internal permission validation failed' });
    }
  };
};

/**
 * Middleware to apply automatic scoping based on user's role and hierarchy
 * Adds req.scope with appropriate where clauses for different entity types
 * @param {string[]} entityTypes - Array of entity types to scope (e.g., ['Order', 'Invoice', 'Dealer'])
 * @returns {Function} Express middleware
 */
const applyScope = (entityTypes = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next();
      }

      const roleName = req.user.roleDetails?.name || req.user.role;

      // Super Admin & Technical Admin see all
      if (['super_admin', 'technical_admin'].includes(roleName)) {
        req.scope = {};
        return next();
      }

      // Build scope for each entity type
      req.scope = {};

      for (const entityType of entityTypes) {
        const whereClause = await RBACEngine.buildScopeWhereClause(req.user, entityType);
        req.scope[entityType.toLowerCase()] = whereClause;
      }

      // Also add user's scope info for reference
      req.userScope = RBACEngine.getUserScope(req.user);

      next();
    } catch (err) {
      console.error('Scoping middleware error:', err);
      return res.status(500).json({ error: 'Scope check failed' });
    }
  };
};

/**
 * Middleware to check if user can access a specific resource
 * Expects resourceId in req.params and entityType in req.body or query
 * @param {string} entityType - Type of entity (e.g., 'Order', 'Invoice')
 * @returns {Function} Express middleware
 */
const requireResourceAccess = (entityType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const resourceId = req.params.id || req.params.resourceId;
      if (!resourceId) {
        return res.status(400).json({ error: 'Resource ID required' });
      }

      // Load the resource based on entity type
      const models = require('../models');
      const Model = models[entityType];
      if (!Model) {
        return res.status(400).json({ error: `Invalid entity type: ${entityType}` });
      }

      const resource = await Model.findByPk(resourceId);
      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      // Check if user can access this resource
      const canAccess = await RBACEngine.canAccessResource(req.user, resource);
      if (!canAccess) {
        return res.status(403).json({ error: 'Access Denied - Resource out of scope' });
      }

      // Attach resource to request for use in controller
      req.resource = resource;

      next();
    } catch (err) {
      console.error('Resource access check error:', err);
      return res.status(500).json({ error: 'Resource access check failed' });
    }
  };
};

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  applyScope,
  requireResourceAccess
};

