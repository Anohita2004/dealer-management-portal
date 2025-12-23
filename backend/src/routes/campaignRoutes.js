const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { authenticate, authorize } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const { applyScope } = require('../middleware/rbac');

router.get('/', authenticate, authorize('dealer_admin', 'dealer_staff', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin', 'super_admin', 'technical_admin'), checkPermission('campaigns.view'), applyScope(['Campaign']), campaignController.getAllCampaigns);
router.get(
  "/active",
  authenticate,
  authorize("dealer_admin", "territory_manager", "area_manager", "super_admin"),
  checkPermission("campaigns.view"),
  applyScope(['Campaign']),
  campaignController.getActiveCampaigns
);
//router.get('/:id', authenticate, campaignController.getCampaignById);
router.get(
  "/:id",
  authenticate,
  authorize("dealer_admin", "territory_manager", "area_manager", "super_admin"),
  checkPermission("campaigns.view"),
  applyScope(['Campaign']),
  campaignController.getCampaignById
);
router.post('/', authenticate, authorize('super_admin', 'key_user'), checkPermission('campaigns.create'), campaignController.createCampaign);
router.put('/:id', authenticate, authorize('super_admin', 'key_user'), checkPermission('campaigns.edit'), campaignController.updateCampaign);
router.delete('/:id', authenticate, authorize('super_admin', 'key_user'), checkPermission('campaigns.delete'), campaignController.deleteCampaign);

// Approval routes
// router.post('/:id/approve', authenticate, authorize('area_manager', 'regional_admin', 'super_admin'), campaignController.approveCampaign);
// router.get('/pending/approvals', authenticate, authorize('area_manager', 'regional_admin', 'super_admin'), campaignController.getPendingCampaigns);

// Analytics route
router.get(
  '/:id/analytics',
  authenticate,
  authorize('super_admin', 'regional_admin', 'area_manager'),
  checkPermission('campaigns.view'),
  campaignController.getCampaignAnalytics
);

module.exports = router;
