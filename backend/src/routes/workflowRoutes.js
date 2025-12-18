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

// Approve entity
router.patch(
  '/:type/:id/approve',
  authenticate,
  checkPermission('workflow.approve'),
  workflowController.approveEntity
);

// Reject entity
router.patch(
  '/:type/:id/reject',
  authenticate,
  checkPermission('workflow.reject'),
  workflowController.rejectEntity
);

// Get workflow status
router.get(
  '/:type/:id/workflow',
  authenticate,
  checkPermission('workflow.view'),
  workflowController.getWorkflowStatus
);

module.exports = router;

