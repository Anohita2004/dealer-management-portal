// ==============================
// FILE: src/routes/pricingRoutes.js
// ==============================

const express = require("express");
const router = express.Router();
const pricingController = require("../controllers/pricingController");
const { authenticate, authorize } = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");
const { applyScope } = require("../middleware/rbac");

// ✅ Dealers & Managers can request price change
router.post(
  "/request",
  authenticate,
  authorize("dealer_staff","dealer_admin", "area_manager", "territory_manager", "regional_manager"),
  checkPermission("pricing.request"),
  pricingController.requestPricingChange
);

// ✅ Admin, AM, TM, Dealer can view pricing updates
router.get(
  "/",
  authenticate,
  authorize("dealer_staff","dealer_admin", "area_manager", "territory_manager", "regional_manager"),
  checkPermission("pricing.view"),
  applyScope(["Dealer"]),
  pricingController.getPricingUpdates
);

// ✅ Admin-only pricing summary (for dashboard)
router.get(
  "/summary",
  authenticate,
  authorize("super_admin"),
  checkPermission("pricing.view"),
  pricingController.getPricingSummary
);
router.patch("/:id", authenticate, authorize("dealer_staff","dealer_admin", "area_manager", "territory_manager", "regional_manager"), checkPermission("pricing.manage"), pricingController.updatePricingStatus);
router.get(
  "/manager",
  authenticate,
  authorize("area_manager", "territory_manager", "regional_manager"),
  checkPermission("pricing.view"),
  applyScope(["Dealer"]),
  pricingController.getManagerPricingRequests
);

module.exports = router;
