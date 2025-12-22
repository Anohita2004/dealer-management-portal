// src/routes/materialRoutes.js
const express = require("express");
const router = express.Router();
const materialController = require("../controllers/materialController");
const materialGroupController = require("../controllers/materialGroupController");
const { authenticate, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");
const checkPermission = require("../middleware/checkPermission");

// -------------------------
// Material Groups
// -------------------------

router.get(
  "/groups",
  authenticate,
  checkPermission("materials.view"),
  materialGroupController.getGroups
);

router.post(
  "/groups",
  authenticate,
  authorize("super_admin", "technical_admin", "dealer_admin", "inventory_user"),
  checkPermission("materials.manage"),
  materialGroupController.createGroup
);

router.post(
  "/groups/:id/assign-material",
  authenticate,
  authorize("super_admin"),
  checkPermission("materials.manage"),
  materialGroupController.assignMaterial
);

// -------------------------
// Material Master
// -------------------------

router.get(
  "/analytics",
  authenticate,
  checkPermission("inventory.view"),
  materialController.analytics
);

router.get(
  "/alerts",
  authenticate,
  checkPermission("inventory.view"),
  materialController.alerts
);

// 🔥 SINGLE clean template route
router.get(
  "/template",
  authenticate,
  checkPermission("inventory.view"),
  materialController.downloadTemplate
);

router.get(
  "/",
  authenticate,
  checkPermission("inventory.view"),
  materialController.getMaterials
);

// Dealer-scoped materials for ordering – respects dealer-material mappings
router.get(
  "/dealer/:dealerId",
  authenticate,
  authorize(
    "dealer_admin",
    "dealer_staff",
    "sales_executive",
    "territory_manager",
    "area_manager",
    "regional_manager",
    "regional_admin",
    "super_admin",
    "technical_admin"
  ),
  checkPermission("inventory.view"),
  materialController.getDealerMaterials
);

router.get(
  "/:id",
  authenticate,
  checkPermission("inventory.view"),
  materialController.getMaterialById
);

router.post(
  "/",
  authenticate,
  authorize("super_admin", "technical_admin", "inventory_user"),
  checkPermission("inventory.manage"),
  materialController.createMaterial
);

router.post(
  "/import",
  authenticate,
   authorize("super_admin", "technical_admin", "inventory_user"),
  checkPermission("inventory.manage"),
  upload.single("file"),
  materialController.importMaterials
);

router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "technical_admin", "inventory_user"),
  checkPermission("inventory.manage"),
  materialController.updateMaterial
);

router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "technical_admin", "inventory_user"),
  checkPermission("inventory.manage"),
  materialController.deleteMaterial
);
// upload + preview validation
router.post("/upload-preview", authenticate, authorize("super_admin", "technical_admin", "inventory_user"), checkPermission("inventory.manage"), upload.single("file"), materialController.uploadMaterialPreview);
module.exports = router;
