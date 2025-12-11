const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, campaignController.getAllCampaigns);
router.get(
  "/active",
  authenticate,
  authorize("dealer_admin", "territory_manager", "area_manager", "super_admin"),
  campaignController.getActiveCampaigns
);
//router.get('/:id', authenticate, campaignController.getCampaignById);
router.get(
  "/:id",
  authenticate,
  authorize("dealer_admin", "territory_manager", "area_manager", "super_admin"),
  campaignController.getCampaignById
);
router.post('/', authenticate, authorize('super_admin', 'key_user'), campaignController.createCampaign);
router.put('/:id', authenticate, authorize('super_admin', 'key_user'), campaignController.updateCampaign);
router.delete('/:id', authenticate, authorize('super_admin', 'key_user'), campaignController.deleteCampaign);

// Approval routes
// router.post('/:id/approve', authenticate, authorize('area_manager', 'regional_admin', 'super_admin'), campaignController.approveCampaign);
// router.get('/pending/approvals', authenticate, authorize('area_manager', 'regional_admin', 'super_admin'), campaignController.getPendingCampaigns);

// Targeting and analytics routes
// router.get('/dealer/me', authenticate, authorize('dealer_admin', 'dealer_staff'), campaignController.getDealerCampaigns);
// router.get('/area/:areaId', authenticate, campaignController.getCampaignsByArea);
// router.get('/:id/analytics', authenticate, authorize('super_admin', 'regional_admin', 'area_manager'), campaignController.getCampaignAnalytics);
// router.get('/summary/stats', authenticate, authorize('super_admin', 'regional_admin'), campaignController.getCampaignSummary);

module.exports = router;
