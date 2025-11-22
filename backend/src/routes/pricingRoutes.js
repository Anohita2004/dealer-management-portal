// ==============================
// FILE: src/routes/pricingRoutes.js
// ==============================

const express = require("express");
const router = express.Router();
const pricingController = require("../controllers/pricingController");
const { authenticate, authorize } = require("../middleware/auth");

// ✅ Dealers & Managers can request price change
router.post(
  "/request",
  authenticate,
  authorize("dealer", "am", "tm"),
  pricingController.requestPricingChange
);

// ✅ Admin, AM, TM, Dealer can view pricing updates
router.get(
  "/",
  authenticate,
  authorize("admin", "am", "tm", "dealer_admin"),
  pricingController.getPricingUpdates
);

// ✅ Admin-only pricing summary (for dashboard)
router.get(
  "/summary",
  authenticate,
  authorize("admin"),
  pricingController.getPricingSummary
);
router.patch("/:id", authenticate, authorize("admin","tm","am"), pricingController.updatePricingStatus);
router.get(
  "/manager",
  authenticate,
  authorize("tm", "am", "sm"),
  pricingController.getManagerPricingRequests
);

module.exports = router;
