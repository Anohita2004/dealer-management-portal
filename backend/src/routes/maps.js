// src/routes/maps.js
const express = require('express');
const router = express.Router();
const maps = require('../controllers/mapsController');

router.get('/dealers', maps.getDealerPins);
router.get('/heatmap', maps.getHeatmap);
router.get('/regions', maps.getRegionsGeo);
router.get('/territories', maps.getTerritoriesGeo);

module.exports = router;
