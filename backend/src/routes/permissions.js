const router = require("express").Router();
const controller = require("../controllers/permissionController");

router.post("/", controller.createPermission);
router.get("/", controller.getPermissions);

module.exports = router;
