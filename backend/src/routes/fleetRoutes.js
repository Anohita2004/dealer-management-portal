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
// Note: Drivers can view their own assignments (controller filters by driver)
router.get(
  "/assignments",
  authenticate,
  async (req, res, next) => {
    // Allow drivers to bypass permission check - controller will filter to their assignments
    const userRole = req.user?.roleDetails?.name || req.user?.role;
    if (userRole === 'driver') {
      return next();
    }
    // For other roles, check permission
    return checkPermission("fleet.view")(req, res, next);
  },
  fleetController.getAssignments
);

// Get assignment by ID
// Note: Drivers can view their own assignments (controller verifies ownership)
router.get(
  "/assignments/:id",
  authenticate,
  async (req, res, next) => {
    // Allow drivers to bypass permission check - controller will verify they own the assignment
    const userRole = req.user?.roleDetails?.name || req.user?.role;
    if (userRole === 'driver') {
      return next();
    }
    // For other roles, check permission
    return checkPermission("fleet.view")(req, res, next);
  },
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
// Note: Drivers typically don't use this endpoint (they use pickup/deliver), but allow if needed
router.patch(
  "/assignments/:id/status",
  authenticate,
  async (req, res, next) => {
    // Allow drivers to bypass permission check - controller will verify ownership
    const userRole = req.user?.roleDetails?.name || req.user?.role;
    if (userRole === 'driver') {
      return next();
    }
    // For other roles, check permission
    return checkPermission("fleet.assign")(req, res, next);
  },
  fleetController.updateAssignmentStatus
);

// Mark pickup
// Note: Drivers can mark pickup for their own assignments (checked in controller)
router.post(
  "/assignments/:id/pickup",
  authenticate,
  async (req, res, next) => {
    // Allow drivers to bypass permission check - controller will verify ownership
    const userRole = req.user?.roleDetails?.name || req.user?.role;
    if (userRole === 'driver') {
      return next();
    }
    // For other roles, check permission
    return checkPermission("fleet.assign")(req, res, next);
  },
  fleetController.markPickup
);

// Mark delivered
// Note: Drivers can mark delivery for their own assignments (checked in controller)
router.post(
  "/assignments/:id/deliver",
  authenticate,
  async (req, res, next) => {
    // Allow drivers to bypass permission check - controller will verify ownership
    const userRole = req.user?.roleDetails?.name || req.user?.role;
    if (userRole === 'driver') {
      return next();
    }
    // For other roles, check permission
    return checkPermission("fleet.assign")(req, res, next);
  },
  fleetController.markDelivered
);

module.exports = router;

