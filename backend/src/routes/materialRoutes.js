// src/routes/materialRoutes.js
const express = require("express");
const router = express.Router();
const materialController = require("../controllers/materialController");
const materialGroupController = require("../controllers/materialGroupController");
const { authenticate, authorize } = require("../middleware/auth");

// Material Groups
router.get("/groups", authenticate, materialGroupController.getGroups);

router.post(
  "/groups/:id/assign-material",
  authenticate,
  authorize("super_admin"),
  materialGroupController.assignMaterial
);

// Material Master
router.get("/", authenticate, materialController.getMaterials);
router.get("/:id", authenticate, materialController.getMaterialById);
router.post("/", authenticate, authorize("super_admin", "technical_admin","inventory"), materialController.createMaterial);
router.put("/:id", authenticate, authorize("super_admin","technical_admin", "inventory"), materialController.updateMaterial);
router.delete("/:id", authenticate, authorize("super_admin","technical_admin", "inventory"), materialController.deleteMaterial);
router.post("/groups", authenticate, authorize("super_admin", "technical_admin","dealer", "inventory"), materialGroupController.createGroup);

module.exports = router;
