const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const { applyScoping } = require('../middleware/scoping');
//router.get('/dealer-performance', verifyToken, reportController.getDealerPerformanceReport);

router.get('/dealer-performance', authenticate, checkPermission('reports.view'), applyScoping(['Dealer']), reportController.getDealerPerformanceReport);
router.get('/account-statement', authenticate, checkPermission('reports.view'), applyScoping(['Dealer']), reportController.getAccountStatementReport);
router.get('/invoice-register', authenticate, checkPermission('reports.view'), applyScoping(['Invoice']), reportController.getInvoiceRegisterReport);
router.get('/credit-debit-notes', authenticate, checkPermission('reports.view'), applyScoping(['Dealer']), reportController.getCreditDebitNoteReport);
router.get('/outstanding-receivables', authenticate, checkPermission('reports.view'), applyScoping(['Dealer']), reportController.getOutstandingReceivablesReport);
router.get('/territory', authenticate, checkPermission('reports.view'), applyScoping(['Dealer']), reportController.getTerritoryReport);
router.get("/admin-summary",
  authenticate,
  checkPermission("dashboard.view.superadmin"),
  reportController.getAdminSummary
);
router.get("/dashboard/super", authenticate, checkPermission("dashboard.view.superadmin"), applyScoping(['Dealer']), reportController.getSuperDashboard);
router.get("/dashboard/regional", authenticate, checkPermission("dashboard.view.regional"), applyScoping(['Dealer']), reportController.getRegionalDashboard);
router.get("/dashboard/manager", authenticate, checkPermission("dashboard.view.manager"), applyScoping(['Dealer']), reportController.getManagerDashboard);
router.get("/dashboard/dealer", authenticate, checkPermission("dashboard.view.dealer"), applyScoping(['Dealer']), reportController.getDealerDashboard);
router.get(
  "/pending-approvals",
  authenticate,
  authorize("super_admin", "area_manager", "territory_manager", "regional_manager", "regional_admin"),
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



module.exports = router;
