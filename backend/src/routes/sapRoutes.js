const express = require('express');
const router = express.Router();
const sapController = require('../controllers/sapController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/sync-dealers', authenticate, authorize('admin'), sapController.syncDealers);
router.get('/customer-account/:dealerId', authenticate, sapController.fetchCustomerAccount);
router.get('/vendor-account/:dealerId', authenticate, sapController.fetchVendorAccount);
router.post('/credit-debit-note', authenticate, authorize('admin', 'key_user'), sapController.createCreditDebitNote);
router.post('/sync-invoices/:dealerId', authenticate, authorize('admin'), sapController.syncInvoices);

module.exports = router;
