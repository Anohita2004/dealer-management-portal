const express = require('express');
const router = express.Router();
const goodsReceiptController = require('../controllers/goodsReceiptController');

// CRUD endpoints
router.post('/', goodsReceiptController.createGoodsReceipt);
router.get('/', goodsReceiptController.getAllGoodsReceipts);
router.get('/:id', goodsReceiptController.getGoodsReceiptById);
router.put('/:id', goodsReceiptController.updateGoodsReceipt);
router.delete('/:id', goodsReceiptController.deleteGoodsReceipt);

// Workflow actions
router.post('/:id/approve', goodsReceiptController.approveGoodsReceipt);
router.post('/:id/reject', goodsReceiptController.rejectGoodsReceipt);
router.post('/:id/post', goodsReceiptController.postGoodsReceiptToSAP); // stub for SAP posting

module.exports = router;
