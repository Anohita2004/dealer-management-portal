const router = require("express").Router();
const upload = require("../middleware/upload");
const { authenticate, authorize } = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");

const {
  createPaymentRequest,
  getDealerPayments,
  getDealerAdminPending,
  getPendingPayments,
  approvePayment,
  rejectPayment,
  autoReconcile,
  getDuePayments,
  getWorkflowStatus,
  getPaymentById,
  bulkApprovePayments,
  bulkRejectPayments,
} = require("../controllers/paymentController");

const {
  createGatewayOrder,
  handleWebhook,
  verifyPayment
} = require("../controllers/paymentGatewayController");

// -----------------------
// GATEWAY ROUTES (Public/Dealer)
// -----------------------
// Webhook must be public and come before authenticated routes to avoid JWT issues if it's not excluded in middleware
router.post("/webhook/razorpay", handleWebhook);

router.post(
  "/gateway/init",
  authenticate,
  authorize("dealer_admin", "dealer_staff"),
  createGatewayOrder
);

router.post(
  "/gateway/verify",
  authenticate,
  authorize("dealer_admin", "dealer_staff"),
  verifyPayment
);

// -----------------------
// DEALER STAFF ROUTES
// -----------------------
router.post(
  "/request",
  authenticate,
  authorize("dealer_staff", "sales_executive"),
  checkPermission("payments.create"),
  upload.single("proofFile"),
  createPaymentRequest
);

router.get(
  "/mine",
  authenticate,
  authorize("dealer_admin", "dealer_staff", "sales_executive"),
  checkPermission("payments.view"),
  getDealerPayments
);

// Get due payments (outstanding invoices)
router.get("/due", authenticate, authorize("dealer_admin", "dealer_staff", "finance_admin", "super_admin", "sales_executive"), checkPermission("payments.view"), getDuePayments);

// -----------------------
// DEALER ADMIN ROUTES
// -----------------------
router.get("/dealer/pending", authenticate, authorize("dealer_admin"), checkPermission("payments.view"), getDealerAdminPending);

router.post("/dealer/:id/approve", authenticate, authorize("dealer_admin"), checkPermission("payments.approve"), approvePayment);
router.post("/dealer/:id/reject", authenticate, authorize("dealer_admin"), checkPermission("payments.approve"), rejectPayment);

// -----------------------
// FINANCE ADMIN / MANAGER ROUTES
// -----------------------
router.get("/pending", authenticate, authorize("super_admin", "technical_admin", "dealer_admin", "finance_admin", "territory_manager", "area_manager", "regional_manager", "regional_admin"), checkPermission("payments.view"), getPendingPayments);

router.post("/:id/approve", authenticate, authorize("super_admin", "technical_admin", "dealer_admin", "finance_admin", "territory_manager", "area_manager", "regional_manager", "regional_admin"), checkPermission("payments.approve"), approvePayment);
router.post("/:id/reject", authenticate, authorize("super_admin", "technical_admin", "dealer_admin", "finance_admin", "territory_manager", "area_manager", "regional_manager", "regional_admin"), checkPermission("payments.approve"), rejectPayment);

// BULK ACTIONS
router.post("/bulk/approve", authenticate, authorize("super_admin", "technical_admin", "dealer_admin", "finance_admin", "territory_manager", "area_manager", "regional_manager", "regional_admin"), checkPermission("payments.approve"), bulkApprovePayments);
router.post("/bulk/reject", authenticate, authorize("super_admin", "technical_admin", "dealer_admin", "finance_admin", "territory_manager", "area_manager", "regional_manager", "regional_admin"), checkPermission("payments.approve"), bulkRejectPayments);

// GET PAYMENT WORKFLOW STATUS
router.get("/:id/workflow", authenticate, authorize("super_admin", "technical_admin", "dealer_admin", "finance_admin", "territory_manager", "area_manager", "regional_manager", "regional_admin"), checkPermission("payments.view"), getWorkflowStatus);

// -----------------------
// AUTO-RECONCILIATION
// -----------------------
router.get("/reconcile", authenticate, authorize("finance_admin", "super_admin"), checkPermission("payments.approve"), autoReconcile);

// -----------------------
// GET SINGLE PAYMENT BY ID (must be last to avoid catching other routes)
// -----------------------
router.get("/:id", authenticate, authorize("dealer_admin", "dealer_staff", "finance_admin", "territory_manager", "area_manager", "regional_manager", "regional_admin", "super_admin", "sales_executive"), checkPermission("payments.view"), getPaymentById);

module.exports = router;
