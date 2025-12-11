const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const checkPermission = require("../middleware/checkPermission");
const productController = require("../controllers/productController");

router.get("/", authenticate, checkPermission("inventory.view"), productController.getProducts);

module.exports = router;
