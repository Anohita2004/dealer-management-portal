const express = require("express");
const router = express.Router();

const orderController = require("../controllers/orderController");
const { authenticate, authorize } = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");
const { applyScope } = require("../middleware/rbac");

// ---------------------------
// DEALER / STAFF CREATE ORDER (DRAFT/PENDING)
// ---------------------------
router.post(
  "/",
  authenticate,
  authorize("dealer_admin", "dealer_staff", "sales_executive"),
  checkPermission("orders.create"),
  orderController.placeOrder
);

// ---------------------------
// SUBMIT ORDER FOR APPROVAL
// ---------------------------
router.post(
  "/:id/submit",
  authenticate,
  authorize("dealer_admin", "dealer_staff", "sales_executive"),
  checkPermission("orders.submit"),
  orderController.submitOrder
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
  applyScope(["Order"]),
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

// ---------------------------
// ORDER TRACKING
// ---------------------------
router.get(
  "/:id/tracking",
  authenticate,
  checkPermission("fleet.track"),
  orderController.getOrderTracking
);

module.exports = router;
