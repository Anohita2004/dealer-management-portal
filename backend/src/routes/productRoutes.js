const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const productController = require("../controllers/productController");

router.get("/", authenticate, productController.getProducts);

module.exports = router;
