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
// REGIONAL ADMIN ACCESS (for user management in their region)
const regionalAdminAccess = authorize('super_admin', 'technical_admin', 'regional_admin');

// ---------------------------------------------------------
// USER MANAGEMENT
// ---------------------------------------------------------
router.get('/users',          regionalAdminAccess, adminController.getAllUsers);
router.get('/users/:id',      regionalAdminAccess, adminController.getUserById);
router.post('/users',         regionalAdminAccess, adminController.createUser);
router.put('/users/:id',      regionalAdminAccess, adminController.updateUser);
router.patch('/users/:id/role', regionalAdminAccess, adminController.updateUserRole);
router.delete('/users/:id',   regionalAdminAccess, adminController.deleteUser);

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
