const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate, authorize } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

router.get('/', authenticate, authorize('dealer_admin', 'dealer_staff', 'sales_executive', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin', 'super_admin', 'technical_admin', 'finance_admin'), checkPermission('invoices.view'), invoiceController.getAllInvoices);
router.get('/:id', authenticate, authorize('dealer_admin', 'dealer_staff', 'sales_executive', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin', 'super_admin', 'technical_admin', 'finance_admin'), checkPermission('invoices.view'), invoiceController.getInvoiceById);
router.get('/:id/pdf', authenticate, authorize('dealer_admin', 'dealer_staff', 'sales_executive', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin', 'super_admin', 'technical_admin', 'finance_admin'), checkPermission('invoices.view'), invoiceController.generateInvoicePDF);
// Allow dealer_staff to request/create invoices for approved orders;
// controller will enforce order ownership and approved status checks.
router.post('/', authenticate, authorize('super_admin', 'technical_admin', 'key_user', 'dealer_admin', 'dealer_staff'), checkPermission('invoices.create'), invoiceController.createInvoice);
router.put('/:id', authenticate, authorize('super_admin', 'key_user'), checkPermission('invoices.edit'), invoiceController.updateInvoice);

// Approval routes (support both PATCH and POST for frontend compatibility)
router.patch('/:id/approve', authenticate, authorize('dealer_admin', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin'), checkPermission('invoices.edit'), invoiceController.approveInvoice);
router.post('/:id/approve', authenticate, authorize('dealer_admin', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin'), checkPermission('invoices.edit'), invoiceController.approveInvoice);
router.patch('/:id/reject', authenticate, authorize('dealer_admin', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin'), checkPermission('invoices.edit'), invoiceController.rejectInvoice);
router.post('/:id/reject', authenticate, authorize('dealer_admin', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin'), checkPermission('invoices.edit'), invoiceController.rejectInvoice);

// Bulk actions
router.post('/bulk/approve', authenticate, authorize('dealer_admin', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin'), checkPermission('invoices.edit'), invoiceController.bulkApproveInvoices);
router.post('/bulk/reject', authenticate, authorize('dealer_admin', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin'), checkPermission('invoices.edit'), invoiceController.bulkRejectInvoices);

router.get('/pending/approvals', authenticate, authorize('dealer_admin', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin'), checkPermission('invoices.view'), invoiceController.getPendingInvoices);

// Workflow status
router.get('/:id/workflow', authenticate, authorize('dealer_admin', 'dealer_staff', 'sales_executive', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin', 'super_admin', 'technical_admin', 'finance_admin'), checkPermission('invoices.view'), invoiceController.getWorkflowStatus);

module.exports = router;
