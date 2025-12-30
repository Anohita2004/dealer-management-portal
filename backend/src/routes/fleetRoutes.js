const express = require("express");
const router = express.Router();

const fleetController = require("../controllers/fleetController");
const { authenticate } = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");

// Assign truck to order
router.post(
  "/assign",
  authenticate,
  checkPermission("fleet.assign"),
  fleetController.assignTruckToOrder
);

// Get all assignments (scoped)
router.get(
  "/assignments",
  authenticate,
  checkPermission("fleet.view"),
  fleetController.getAssignments
);

// Get assignment by ID
router.get(
  "/assignments/:id",
  authenticate,
  checkPermission("fleet.view"),
  fleetController.getAssignment
);

// Update assignment (PUT)
router.put(
  "/assignments/:id",
  authenticate,
  checkPermission("fleet.assign"),
  fleetController.updateAssignment
);

// Update assignment status
router.patch(
  "/assignments/:id/status",
  authenticate,
  checkPermission("fleet.assign"),
  fleetController.updateAssignmentStatus
);

// Mark pickup
router.post(
  "/assignments/:id/pickup",
  authenticate,
  checkPermission("fleet.assign"),
  fleetController.markPickup
);

// Mark delivered
router.post(
  "/assignments/:id/deliver",
  authenticate,
  checkPermission("fleet.assign"),
  fleetController.markDelivered
);

module.exports = router;

