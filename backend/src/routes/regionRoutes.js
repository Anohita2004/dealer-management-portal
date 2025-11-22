const express = require("express");
const router = express.Router();

const regionController = require("../controllers/regionController");

// GET /api/regions
router.get("/regions", regionController.getRegions);

module.exports = router;
