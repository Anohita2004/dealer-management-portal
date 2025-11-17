const router = require("express").Router();
const controller = require("../controllers/roleController");

router.post("/", controller.createRole);
router.get("/", controller.getRoles);
router.post("/assign-permission", controller.assignPermission);

module.exports = router;
