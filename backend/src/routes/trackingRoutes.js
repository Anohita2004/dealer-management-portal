const express = require("express");
const router = express.Router();

const trackingController = require("../controllers/trackingController");
const { authenticate } = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");

// Start GPS tracking from driver's current location
router.post(
  "/start",
  authenticate,
  trackingController.startTracking
);

// Update truck location (mobile app)
// Note: This endpoint may use API key authentication instead of JWT
router.post(
  "/location",
  authenticate, // Can be replaced with API key middleware for mobile app
  trackingController.updateLocation
);

// Get all active truck locations
router.get(
  "/live",
  authenticate,
  checkPermission("fleet.track"),
  trackingController.getLiveLocations
);

// Get tracking info for order
router.get(
  "/order/:orderId",
  authenticate,
  checkPermission("fleet.track"),
  trackingController.getOrderTracking
);

// Get current ETA for assignment
router.get(
  "/assignment/:id/eta",
  authenticate,
  checkPermission("fleet.track"),
  trackingController.getAssignmentETA
);

// Get truck location history
router.get(
  "/truck/:truckId/history",
  authenticate,
  checkPermission("fleet.track"),
  trackingController.getTruckHistory
);

module.exports = router;

