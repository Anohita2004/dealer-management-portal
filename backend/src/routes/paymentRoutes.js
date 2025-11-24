const router = require("express").Router();
const upload = require("../middleware/upload");

const {
  createPaymentRequest,
  getDealerPayments,
  getDealerAdminPending,
  reviewPaymentByDealerAdmin,
  getPendingPayments,
  reviewPayment,
  autoReconcile
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

router.post("/dealer/:id/review", reviewPaymentByDealerAdmin);

// -----------------------
// FINANCE ADMIN ROUTES
// -----------------------
router.get("/pending", getPendingPayments);

router.post("/:id/review", reviewPayment);

// -----------------------
// AUTO-RECONCILIATION
// -----------------------
router.get("/reconcile", autoReconcile);

module.exports = router;
