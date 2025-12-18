const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate, authorize } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const { applyScoping } = require('../middleware/scoping');

router.get('/', authenticate, checkPermission('invoices.view'), applyScoping(['Invoice']), invoiceController.getAllInvoices);
router.get('/:id', authenticate, checkPermission('invoices.view'), applyScoping(['Invoice']), invoiceController.getInvoiceById);
router.get('/:id/pdf', authenticate, checkPermission('invoices.view'), applyScoping(['Invoice']), invoiceController.generateInvoicePDF);
// Allow dealer_staff to request/create invoices for approved orders;
// controller will enforce order ownership and approved status checks.
router.post('/', authenticate, authorize('super_admin', 'key_user', 'dealer_staff'), checkPermission('invoices.create'), invoiceController.createInvoice);
router.put('/:id', authenticate, authorize('super_admin', 'key_user'), checkPermission('invoices.edit'), invoiceController.updateInvoice);

// Approval routes
router.patch('/:id/approve', authenticate, authorize('dealer_admin', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin'), checkPermission('invoices.edit'), invoiceController.approveInvoice);
router.patch('/:id/reject', authenticate, authorize('dealer_admin', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin'), checkPermission('invoices.edit'), invoiceController.rejectInvoice);
router.get('/pending/approvals', authenticate, authorize('dealer_admin', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin'), checkPermission('invoices.view'), applyScoping(['Invoice']), invoiceController.getPendingInvoices);

// Workflow status
router.get('/:id/workflow', authenticate, checkPermission('invoices.view'), invoiceController.getWorkflowStatus);

module.exports = router;
