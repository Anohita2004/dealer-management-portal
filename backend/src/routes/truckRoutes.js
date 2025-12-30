const express = require("express");
const router = express.Router();

const truckController = require("../controllers/truckController");
const { authenticate } = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");
const { applyScope } = require("../middleware/rbac");

// Get all trucks (scoped)
router.get(
  "/",
  authenticate,
  checkPermission("fleet.view"),
  applyScope(["Truck"]),
  truckController.getTrucks
);

// Get truck by ID
router.get(
  "/:id",
  authenticate,
  checkPermission("fleet.view"),
  truckController.getTruck
);

// Get truck current location
router.get(
  "/:id/location",
  authenticate,
  checkPermission("fleet.track"),
  truckController.getTruckLocation
);

// Get truck location history
router.get(
  "/:id/history",
  authenticate,
  checkPermission("fleet.track"),
  truckController.getTruckHistory
);

// Create truck
router.post(
  "/",
  authenticate,
  checkPermission("fleet.manage"),
  truckController.createTruck
);

// Update truck
router.put(
  "/:id",
  authenticate,
  checkPermission("fleet.manage"),
  truckController.updateTruck
);

// Delete truck (soft delete)
router.delete(
  "/:id",
  authenticate,
  checkPermission("fleet.manage"),
  truckController.deleteTruck
);

module.exports = router;

