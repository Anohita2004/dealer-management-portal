// src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const pricingController = require('../controllers/pricingController');
const { authenticate, authorize } = require('../middleware/auth');
const { triggerSla } = require('../controllers/slaController');

// ---------------------------------------------
// AUTHENTICATION REQUIRED FOR ALL ADMIN ROUTES
// ---------------------------------------------
router.use(authenticate);

// FULL ACCESS ROLES
const fullAccess = authorize('super_admin', 'technical_admin');
// Scoped user-management access (hierarchical)
const scopedUserAdminAccess = authorize(
  'super_admin',
  'technical_admin',
  'regional_admin',
  'regional_manager',
  'area_manager',
  'territory_manager'
);

// ---------------------------------------------------------
// USER MANAGEMENT
// ---------------------------------------------------------
router.get('/users',            scopedUserAdminAccess, adminController.getAllUsers);
router.get('/users/:id',        scopedUserAdminAccess, adminController.getUserById);
router.post('/users',           scopedUserAdminAccess, adminController.createUser);
router.put('/users/:id',        scopedUserAdminAccess, adminController.updateUser);
router.patch('/users/:id/role', scopedUserAdminAccess, adminController.updateUserRole);
router.patch('/users/:id/password', scopedUserAdminAccess, adminController.updateUserPassword);
router.patch('/users/:id/activate', scopedUserAdminAccess, adminController.activateUser);
router.patch('/users/:id/deactivate', scopedUserAdminAccess, adminController.deactivateUser);
router.delete('/users/:id',     scopedUserAdminAccess, adminController.deleteUser);

// ---------------------------------------------------------
// DEALER MANAGEMENT
// ---------------------------------------------------------
router.put('/dealers/:id/block',        fullAccess, adminController.blockDealer);
router.put('/dealers/:id/verify',       fullAccess, adminController.verifyDealer);
router.put('/dealers/:id/assign-region', fullAccess, adminController.assignRegion);

// ---------------------------------------------------------
// SALES GROUP MERGING
// ---------------------------------------------------------
router.post('/sales-groups/merge', fullAccess, adminController.mergeSalesGroups);

// ---------------------------------------------------------
// DOCUMENT REVIEW
// ---------------------------------------------------------
router.put('/documents/:id/review', fullAccess, adminController.reviewDocument);

// ---------------------------------------------------------
// PRICING REVIEW
// ---------------------------------------------------------
router.get('/pricing-updates',           fullAccess, pricingController.getPricingUpdates);
router.patch('/pricing-updates/:id/review', fullAccess, adminController.reviewPricingUpdate);

// ---------------------------------------------------------
// ADMIN REPORTS / DASHBOARD
// ---------------------------------------------------------
router.get('/reports', fullAccess, adminController.getAdminReport);

// ---------------------------------------------------------
// SLA / ESCALATION CHECK (manual trigger or cron)
// ---------------------------------------------------------
router.post('/sla/run', fullAccess, triggerSla);

module.exports = router;
