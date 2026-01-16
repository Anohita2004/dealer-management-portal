const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const { applyScope } = require('../middleware/rbac');
//router.get('/dealer-performance', verifyToken, reportController.getDealerPerformanceReport);

router.get('/dealer-performance', authenticate, checkPermission('reports.view'), applyScope(['Dealer']), reportController.getDealerPerformanceReport);
router.get('/account-statement', authenticate, checkPermission('reports.view'), applyScope(['Dealer']), reportController.getAccountStatementReport);
router.get('/invoice-register', authenticate, checkPermission('reports.view'), applyScope(['Invoice']), reportController.getInvoiceRegisterReport);
router.get('/credit-debit-notes', authenticate, checkPermission('reports.view'), applyScope(['Dealer']), reportController.getCreditDebitNoteReport);
router.get('/outstanding-receivables', authenticate, checkPermission('reports.view'), applyScope(['Dealer']), reportController.getOutstandingReceivablesReport);
router.get('/territory', authenticate, checkPermission('reports.view'), applyScope(['Dealer']), reportController.getTerritoryReport);
router.get("/admin-summary",
  authenticate,
  checkPermission("dashboard.view.superadmin"),
  reportController.getAdminSummary
);
router.get("/dashboard/super", authenticate, checkPermission("dashboard.view.superadmin"), applyScope(['Dealer']), reportController.getSuperDashboard);
router.get("/dashboard/regional", authenticate, checkPermission("dashboard.view.regional"), applyScope(['Dealer']), reportController.getRegionalDashboard);
router.get("/dashboard/manager", authenticate, checkPermission("dashboard.view.manager"), applyScope(['Dealer']), reportController.getManagerDashboard);
router.get("/dashboard/dealer", authenticate, checkPermission("dashboard.view.dealer"), applyScope(['Dealer']), reportController.getDealerDashboard);
router.get(
  "/pending-approvals",
  authenticate,
  authorize("super_admin", "area_manager", "territory_manager", "regional_manager", "regional_admin", "dealer_admin"),
  checkPermission("reports.view"),
  reportController.getPendingApprovals
);
router.get(
  "/regional-sales-summary",
  authenticate,
  authorize("super_admin", "area_manager", "territory_manager", "regional_manager", "regional_admin"),
  checkPermission("reports.view"),
  reportController.getRegionalSalesSummary
);

// --- New Finance Reports ---
const financeRoles = ["super_admin", "finance_admin", "accounts_user"];
router.get('/fi-daywise', authenticate, authorize(...financeRoles), checkPermission('reports.view'), reportController.getFIDaywiseReport);
router.get('/finance/fi-daywise', authenticate, authorize(...financeRoles), checkPermission('reports.view'), reportController.getFIDaywiseReport);
router.get('/collections', authenticate, authorize(...financeRoles), checkPermission('reports.view'), reportController.getCollectionReport);
router.get('/finance/collection', authenticate, authorize(...financeRoles), checkPermission('reports.view'), reportController.getCollectionReport);
router.get('/finance/le-register', authenticate, authorize(...financeRoles), checkPermission('reports.view'), applyScope(['Dealer']), reportController.getAccountStatementReport);
router.get('/finance/drcr-note', authenticate, authorize(...financeRoles), checkPermission('reports.view'), applyScope(['Dealer']), reportController.getCreditDebitNoteReport);
router.get('/finance/sales-register', authenticate, authorize(...financeRoles), checkPermission('reports.view'), applyScope(['Invoice']), reportController.getInvoiceRegisterReport);
router.get('/ageing-link', authenticate, authorize(...financeRoles), (req, res) => res.json({ url: "https://sap.external.system/ageing-analysis" }));

// --- Inventory & Stock Reports ---
router.get('/stock-overview', authenticate, checkPermission('reports.view'), reportController.getStockOverview);
router.get('/inventory/stock-overview', authenticate, checkPermission('reports.view'), reportController.getStockOverview);
router.get('/stock-comparative', authenticate, checkPermission('reports.view'), reportController.getComparativeStockReport);
router.get('/inventory/comparative', authenticate, checkPermission('reports.view'), reportController.getComparativeStockReport);
router.get('/stock-compliance', authenticate, checkPermission('reports.view'), reportController.getComplianceReport);
router.get('/inventory/compliance', authenticate, checkPermission('reports.view'), reportController.getComplianceReport);
router.get('/rr-summary', authenticate, checkPermission('reports.view'), reportController.getRRSummaryReport);
router.get('/inventory/rr-summary', authenticate, checkPermission('reports.view'), reportController.getRRSummaryReport);

// --- Rake & Damage Reports ---
router.get('/rakes', authenticate, checkPermission('reports.view'), reportController.getRakeArrivalReport);
router.get('/rake/arrival', authenticate, checkPermission('reports.view'), reportController.getRakeArrivalReport); // Existing alias
router.get('/rake/data', authenticate, checkPermission('reports.view'), reportController.getRakeArrivalReport); // NEW: Matches frontend call

router.get('/rakes/:id', authenticate, checkPermission('reports.view'), reportController.getRakeDetail);

router.get('/rakes-exceptions', authenticate, checkPermission('reports.view'), reportController.getConsolidatedExceptionReport);
router.get('/rake/exceptions', authenticate, checkPermission('reports.view'), reportController.getConsolidatedExceptionReport); // Existing alias
router.get('/rake/exception', authenticate, checkPermission('reports.view'), reportController.getConsolidatedExceptionReport); // NEW: Matches frontend call

router.get('/rakes-approvals', authenticate, authorize("super_admin", "regional_manager"), reportController.getRakeApprovals);
router.get('/rake/approvals', authenticate, authorize("super_admin", "regional_manager"), reportController.getRakeApprovals); // Existing alias
router.get('/rake/approval', authenticate, authorize("super_admin", "regional_manager"), reportController.getRakeApprovals); // NEW: Matches frontend call

// --- Technical / Data Management ---
router.get('/diversion', authenticate, checkPermission('reports.view'), reportController.getDiversionReport);
router.get('/dms-orders', authenticate, checkPermission('reports.view'), reportController.getDMSOrderRequestReport);
router.get('/dms-requests', authenticate, checkPermission('reports.view'), reportController.getDMSOrderRequestReport);
router.get('/technical/dms-requests', authenticate, checkPermission('reports.view'), reportController.getDMSOrderRequestReport);
router.get('/technical/diversion', authenticate, checkPermission('reports.view'), reportController.getDiversionReport);

// --- Export ---
router.post('/export/pdf', authenticate, checkPermission('reports.view'), reportController.exportReportPDF);
router.post('/export/excel', authenticate, checkPermission('reports.view'), reportController.exportReportExcel);

module.exports = router;
