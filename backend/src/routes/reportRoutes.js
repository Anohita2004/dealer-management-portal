const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');
//router.get('/dealer-performance', verifyToken, reportController.getDealerPerformanceReport);

router.get('/dealer-performance', authenticate, reportController.getDealerPerformanceReport);
router.get('/account-statement', authenticate, reportController.getAccountStatementReport);
router.get('/invoice-register', authenticate, reportController.getInvoiceRegisterReport);
router.get('/credit-debit-notes', authenticate, reportController.getCreditDebitNoteReport);
router.get('/outstanding-receivables', authenticate, reportController.getOutstandingReceivablesReport);
router.get('/territory', authenticate, reportController.getTerritoryReport);
router.get("/admin-summary",
  authenticate,
  reportController.getAdminSummary
);
router.get(
  "/pending-approvals",
  authenticate,
  authorize("tm", "am", "super_admin"),
  reportController.getPendingApprovals
);
router.get(
  "/regional-sales-summary",
  authenticate,
  authorize("super_admin", "am", "tm"),
  reportController.getRegionalSalesSummary
);



module.exports = router;
