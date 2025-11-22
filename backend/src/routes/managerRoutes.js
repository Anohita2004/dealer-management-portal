const express = require('express');
const router = express.Router();
const managerCtrl = require('../controllers/managerController');
const { authenticate, authorize } = require('../middleware/auth');

// Manager summary & dealers
router.get('/summary', authenticate, authorize('tm','am','sm'), managerCtrl.getSummary);
router.get('/dealers', authenticate, authorize('tm','am','sm'), managerCtrl.getDealers);
router.get('/dealers/:id', authenticate, authorize('tm','am','sm'), managerCtrl.getDealerById);

// Pricing triage
router.get('/pricing', authenticate, authorize('tm','am','sm'), managerCtrl.getPricingRequests);
router.patch('/pricing/:id/forward', authenticate, authorize('tm','am','sm'), managerCtrl.forwardPricingToAdmin);

// Assign (admin or key_user)
router.post('/assign-dealer', authenticate, authorize('super_admin','key_user'), managerCtrl.assignDealerToManager);

module.exports = router;
