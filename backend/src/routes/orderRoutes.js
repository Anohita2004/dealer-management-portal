const express = require("express");
const router = express.Router();

const orderController = require("../controllers/orderController");
const { authenticate, authorize } = require("../middleware/auth");

// ---------------------------
// DEALER / STAFF CREATE ORDER
// ---------------------------
router.post(
  "/",
  authenticate,
  authorize("dealer", "dealer_admin", "dealer_staff"),
  orderController.placeOrder
);

// ---------------------------
// DEALER VIEW OWN ORDERS
// ---------------------------
router.get(
  "/my",
  authenticate,
  authorize("dealer", "dealer_admin", "dealer_staff"),
  orderController.getMyOrders
);

// ---------------------------
// ADMIN / MANAGER VIEW ALL
// ---------------------------
router.get(
  "/",
  authenticate,
  authorize("dealer_admin", "regional_manager", "regional_admin", "super_admin"),
  orderController.getAllOrders
);

// ---------------------------
// STATUS UPDATE
// ---------------------------
router.patch(
  "/:id/status",
  authenticate,
  authorize("dealer_admin", "regional_manager", "regional_admin", "super_admin"),
  orderController.updateOrderStatus
);

// ---------------------------
// MULTI-STAGE APPROVAL
// ---------------------------
router.patch(
  "/:id/approve",
  authenticate,
  authorize("dealer_admin", "regional_manager", "regional_admin", "super_admin"),
  orderController.approveOrder
);

router.patch(
  "/:id/reject",
  authenticate,
  authorize("dealer_admin", "regional_manager", "regional_admin", "super_admin"),
  orderController.rejectOrder
);

module.exports = router;
