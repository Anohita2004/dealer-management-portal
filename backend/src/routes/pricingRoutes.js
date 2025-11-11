
const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricingController');
const { authenticate, authorize } = require('../middleware/auth');


router.post('/request', authenticate, authorize('dealer','am','tm'), pricingController.requestPricingChange);
router.get('/', authenticate, authorize('admin','am','tm','dealer'), pricingController.getPricingUpdates);


module.exports = router;