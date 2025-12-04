// src/routes/materialRoutes.js
const express = require("express");
const router = express.Router();
const materialController = require("../controllers/materialController");
const materialGroupController = require("../controllers/materialGroupController");
const { authenticate, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");

// -------------------------
// Material Groups
// -------------------------

router.get(
  "/groups",
  authenticate,
  materialGroupController.getGroups
);

router.post(
  "/groups",
  authenticate,
  authorize("super_admin", "technical_admin", "dealer", "inventory"),
  materialGroupController.createGroup
);

router.post(
  "/groups/:id/assign-material",
  authenticate,
  authorize("super_admin"),
  materialGroupController.assignMaterial
);

// -------------------------
// Material Master
// -------------------------

router.get(
  "/analytics",
  authenticate,
  materialController.analytics
);

router.get(
  "/alerts",
  authenticate,
  materialController.alerts
);

// 🔥 SINGLE clean template route
router.get(
  "/template",
  authenticate,
  materialController.downloadTemplate
);

router.get(
  "/",
  authenticate,
  materialController.getMaterials
);

router.get(
  "/:id",
  authenticate,
  materialController.getMaterialById
);

router.post(
  "/",
  authenticate,
  authorize("super_admin", "technical_admin", "inventory_user"),
  materialController.createMaterial
);

router.post(
  "/import",
  authenticate,
   authorize("super_admin", "technical_admin", "inventory_user"),
  upload.single("file"),
  materialController.importMaterials
);

router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "technical_admin", "inventory_user"),
  materialController.updateMaterial
);

router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "technical_admin", "inventory_user"),
  materialController.deleteMaterial
);
// upload + preview validation
router.post("/upload-preview", upload.single("file"), materialController.uploadMaterialPreview);
module.exports = router;
