const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, campaignController.getAllCampaigns);
router.get('/:id', authenticate, campaignController.getCampaignById);
router.post('/', authenticate, authorize('admin', 'key_user'), campaignController.createCampaign);
router.put('/:id', authenticate, authorize('admin', 'key_user'), campaignController.updateCampaign);
router.delete('/:id', authenticate, authorize('admin', 'key_user'), campaignController.deleteCampaign);

module.exports = router;
