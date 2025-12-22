const express = require("express");
const router = express.Router();

const orderController = require("../controllers/orderController");
const { authenticate, authorize } = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");
const { applyScoping } = require("../middleware/scoping");

// ---------------------------
// DEALER / STAFF CREATE ORDER
// ---------------------------
router.post(
  "/",
  authenticate,
  authorize("dealer_admin", "dealer_staff", "sales_executive"),
  checkPermission("orders.create"),
  orderController.placeOrder
);

// ---------------------------
// DEALER VIEW OWN ORDERS
// ---------------------------
router.get(
  "/my",
  authenticate,
  authorize("dealer_admin", "dealer_staff", "sales_executive"),
  checkPermission("orders.view"),
  orderController.getMyOrders
);

// ---------------------------
// PENDING ORDERS FOR APPROVAL
// ---------------------------
router.get(
  "/pending",
  authenticate,
  authorize("dealer_admin", "territory_manager", "area_manager", "regional_manager", "regional_admin", "super_admin"),
  checkPermission("orders.view"),
  orderController.getPendingOrdersForApproval
);

// ---------------------------
// ADMIN / MANAGER VIEW ALL
// ---------------------------
router.get(
  "/",
  authenticate,
  authorize("dealer_admin", "territory_manager", "area_manager", "regional_manager", "regional_admin", "super_admin"),
  checkPermission("orders.view"),
  applyScoping(["Order"]),
  orderController.getAllOrders
);

// ---------------------------
// STATUS UPDATE
// ---------------------------
router.patch(
  "/:id/status",
  authenticate,
  authorize("dealer_admin", "territory_manager", "area_manager", "regional_manager", "regional_admin", "super_admin"),
  checkPermission("orders.edit"),
  orderController.updateOrderStatus
);

// ---------------------------
// MULTI-STAGE APPROVAL
// ---------------------------
router.patch(
  "/:id/approve",
  authenticate,
  authorize("dealer_admin", "territory_manager", "area_manager", "regional_manager", "regional_admin", "super_admin"),
  checkPermission("orders.approve"),
  orderController.approveOrder
);

router.patch(
  "/:id/reject",
  authenticate,
  authorize("dealer_admin", "territory_manager", "area_manager", "regional_manager", "regional_admin", "super_admin"),
  checkPermission("orders.reject"),
  orderController.rejectOrder
);

// ---------------------------
// WORKFLOW STATUS
// ---------------------------
router.get(
  "/:id/workflow",
  authenticate,
  checkPermission("orders.view"),
  orderController.getWorkflowStatus
);

module.exports = router;
