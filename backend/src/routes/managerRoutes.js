const express = require('express');
const router = express.Router();
const managerCtrl = require('../controllers/managerController');
const { authenticate, authorize } = require('../middleware/auth');

// Manager summary & dealers
router.get('/summary', authenticate, authorize('territory_manager','area_manager','regional_manager'), managerCtrl.getSummary);
router.get('/dealers', authenticate, authorize('territory_manager','area_manager','regional_manager'), managerCtrl.getDealers);
router.get('/dealers/:id', authenticate, authorize('territory_manager','area_manager','regional_manager'), managerCtrl.getDealerById);

// Pricing triage
router.get('/pricing', authenticate, authorize('territory_manager','area_manager','regional_manager'), managerCtrl.getPricingRequests);
router.patch('/pricing/:id/forward', authenticate, authorize('territory_manager','area_manager','regional_manager'), managerCtrl.forwardPricingToAdmin);

// Assign dealers to managers (hierarchical roles)
router.post(
  '/assign-dealer',
  authenticate,
  authorize('super_admin','technical_admin','regional_admin','regional_manager','area_manager','territory_manager'),
  managerCtrl.assignDealerToManager
);

module.exports = router;
