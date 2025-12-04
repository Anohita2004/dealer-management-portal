const router = require("express").Router();
const upload = require("../middleware/upload");

const {
  createPaymentRequest,
  getDealerPayments,
  getDealerAdminPending,
  getPendingPayments,
  approvePayment,
  rejectPayment,
  autoReconcile,
} = require("../controllers/paymentController");

// -----------------------
// DEALER STAFF ROUTES
// -----------------------
router.post(
  "/request",
  upload.single("proofFile"),
  createPaymentRequest
);

router.get("/mine", getDealerPayments);

// -----------------------
// DEALER ADMIN ROUTES
// -----------------------
router.get("/dealer/pending", getDealerAdminPending);

router.post("/dealer/:id/approve", approvePayment);
router.post("/dealer/:id/reject", rejectPayment);

// -----------------------
// FINANCE ADMIN ROUTES
// -----------------------
router.get("/pending", getPendingPayments);

router.post("/:id/approve", approvePayment);
router.post("/:id/reject", rejectPayment);

// -----------------------
// AUTO-RECONCILIATION
// -----------------------
router.get("/reconcile", autoReconcile);

module.exports = router;
