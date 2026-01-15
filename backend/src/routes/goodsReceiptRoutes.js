const express = require('express');
const router = express.Router();
const goodsReceiptController = require('../controllers/goodsReceiptController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/post', authenticate, authorize('dealer_admin', 'dealer_staff', 'super_admin'), goodsReceiptController.postGoodsReceipt);
router.get('/pending', authenticate, authorize('dealer_admin', 'dealer_staff', 'super_admin'), goodsReceiptController.getPendingReceipts);

module.exports = router;
