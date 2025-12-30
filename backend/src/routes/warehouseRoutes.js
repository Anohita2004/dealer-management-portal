const express = require("express");
const router = express.Router();

const warehouseController = require("../controllers/warehouseController");
const { authenticate } = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");
const { applyScope } = require("../middleware/rbac");

// Get all warehouses (scoped)
router.get(
  "/",
  authenticate,
  checkPermission("warehouse.view"),
  applyScope(["Warehouse"]),
  warehouseController.getWarehouses
);

// Get nearest warehouse
router.get(
  "/nearest",
  authenticate,
  checkPermission("warehouse.view"),
  warehouseController.findNearestWarehouse
);

// Get warehouse by ID
router.get(
  "/:id",
  authenticate,
  checkPermission("warehouse.view"),
  warehouseController.getWarehouse
);

// Create warehouse
router.post(
  "/",
  authenticate,
  checkPermission("warehouse.manage"),
  warehouseController.createWarehouse
);

// Update warehouse
router.put(
  "/:id",
  authenticate,
  checkPermission("warehouse.manage"),
  warehouseController.updateWarehouse
);

// Delete warehouse (soft delete)
router.delete(
  "/:id",
  authenticate,
  checkPermission("warehouse.manage"),
  warehouseController.deleteWarehouse
);

module.exports = router;

