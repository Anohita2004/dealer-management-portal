// src/routes/roles.js
const router = require("express").Router();
const controller = require("../controllers/roleController");

// existing routes
router.post("/", controller.createRole);
router.get("/", controller.getRoles);
router.post("/assign-permission", controller.assignPermission);

// NEW: update permissions for a role (frontend expects this: PUT /roles/:roleId/permissions)
router.put("/:roleId/permissions", controller.updateRolePermissions);

module.exports = router;
