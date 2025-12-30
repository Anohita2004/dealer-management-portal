// src/routes/workflowRoutes.js
// Unified workflow routes for all entity types

const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');
const { authenticate } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

/**
 * Generic workflow routes
 * These routes work for: order, invoice, payment, pricing, document, campaign
 * 
 * Usage:
 * - PATCH /api/workflow/order/:id/approve
 * - PATCH /api/workflow/invoice/:id/reject
 * - GET /api/workflow/payment/:id/workflow
 */

// Middleware to map entity type to permission
const getEntityPermission = (type, action) => {
  const permissionMap = {
    order: `orders.${action}`,
    invoice: `invoices.${action}`,
    payment: `payments.${action}`,
    pricing: `pricing.${action}`,
    document: `documents.${action}`,
    campaign: `campaigns.${action}`,
    dealer: `dealer.${action}`,
  };

  // Default to view permission for workflow status
  if (action === 'view') {
    return permissionMap[type] || `${type}s.view`;
  }

  // For approve/reject, map to appropriate permission
  if (action === 'approve') {
    return permissionMap[type] || `${type}s.approve`;
  }

  if (action === 'reject') {
    return permissionMap[type] || `${type}s.reject`;
  }

  return `${type}s.${action}`;
};

// Approve entity
router.patch(
  '/:type/:id/approve',
  authenticate,
  (req, res, next) => {
    const permission = getEntityPermission(req.params.type, 'approve');
    return checkPermission(permission)(req, res, next);
  },
  workflowController.approveEntity
);

// Reject entity
router.patch(
  '/:type/:id/reject',
  authenticate,
  (req, res, next) => {
    const permission = getEntityPermission(req.params.type, 'reject');
    return checkPermission(permission)(req, res, next);
  },
  workflowController.rejectEntity
);

// Get workflow status
router.get(
  '/:type/:id/workflow',
  authenticate,
  (req, res, next) => {
    const permission = getEntityPermission(req.params.type, 'view');
    return checkPermission(permission)(req, res, next);
  },
  workflowController.getWorkflowStatus
);

module.exports = router;

