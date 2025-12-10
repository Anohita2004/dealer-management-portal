const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, invoiceController.getAllInvoices);
router.get('/:id', authenticate, invoiceController.getInvoiceById);
router.get('/:id/pdf', authenticate, invoiceController.generateInvoicePDF);
// Allow dealer_staff to request/create invoices for approved orders;
// controller will enforce order ownership and approved status checks.
router.post('/', authenticate, authorize('super_admin', 'key_user', 'dealer_staff'), invoiceController.createInvoice);
router.put('/:id', authenticate, authorize('super_admin', 'key_user'), invoiceController.updateInvoice);

// Approval routes
router.post('/:id/approve', authenticate, authorize('dealer_admin', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin'), invoiceController.approveInvoice);
router.get('/pending/approvals', authenticate, authorize('dealer_admin', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin'), invoiceController.getPendingInvoices);

module.exports = router;
