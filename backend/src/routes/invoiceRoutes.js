const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, invoiceController.getAllInvoices);
router.get('/:id', authenticate, invoiceController.getInvoiceById);
router.get('/:id/pdf', authenticate, invoiceController.generateInvoicePDF);
router.post('/', authenticate, authorize('admin', 'key_user'), invoiceController.createInvoice);
router.put('/:id', authenticate, authorize('admin', 'key_user'), invoiceController.updateInvoice);

module.exports = router;
