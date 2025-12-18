const router = require("express").Router();
const upload = require("../middleware/upload");
const { authenticate, authorize } = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");
const { applyScoping } = require("../middleware/scoping");

const {
  createPaymentRequest,
  getDealerPayments,
  getDealerAdminPending,
  getPendingPayments,
  approvePayment,
  rejectPayment,
  autoReconcile,
  getDuePayments,
} = require("../controllers/paymentController");
console.log({
  createPaymentRequest,
  getDealerPayments,
  getDealerAdminPending,
  getPendingPayments,
  approvePayment,
  rejectPayment,
  autoReconcile,
});

// -----------------------
// DEALER STAFF ROUTES
// -----------------------
router.post(
  "/request",
  authenticate,
  authorize("dealer_staff"),
  checkPermission("payments.create"),
  upload.single("proofFile"),
  createPaymentRequest
);

router.get("/mine", authenticate, authorize("dealer_admin", "dealer_staff"), checkPermission("payments.view"), applyScoping(["Invoice"]), getDealerPayments);

// Get due payments (outstanding invoices)
router.get("/due", authenticate, authorize("dealer_admin", "dealer_staff", "finance_admin", "super_admin"), checkPermission("payments.view"), getDuePayments);

// -----------------------
// DEALER ADMIN ROUTES
// -----------------------
router.get("/dealer/pending", authenticate, authorize("dealer_admin"), checkPermission("payments.view"), getDealerAdminPending);

router.post("/dealer/:id/approve", authenticate, authorize("dealer_admin"), checkPermission("payments.approve"), approvePayment);
router.post("/dealer/:id/reject", authenticate, authorize("dealer_admin"), checkPermission("payments.approve"), rejectPayment);

// -----------------------
// FINANCE ADMIN ROUTES
// -----------------------
router.get("/pending", authenticate, authorize("dealer_admin", "finance_admin"), checkPermission("payments.view"), getPendingPayments);

router.post("/:id/approve", authenticate, authorize("dealer_admin", "finance_admin"), checkPermission("payments.approve"), approvePayment);
router.post("/:id/reject", authenticate, authorize("dealer_admin", "finance_admin"), checkPermission("payments.approve"), rejectPayment);

// -----------------------
// AUTO-RECONCILIATION
// -----------------------
router.get("/reconcile", authenticate, authorize("finance_admin", "super_admin"), checkPermission("payments.approve"), autoReconcile);

module.exports = router;
