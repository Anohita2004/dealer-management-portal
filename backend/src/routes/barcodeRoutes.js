const express = require('express');
const router = express.Router();
const barcodeController = require('../controllers/barcodeController');
const { authenticate } = require('../middleware/auth');

router.post('/scan', authenticate, barcodeController.scanBarcode);
router.get('/history', authenticate, barcodeController.getScanHistory);

module.exports = router;
