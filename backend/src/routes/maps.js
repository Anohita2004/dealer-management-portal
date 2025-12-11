// src/routes/maps.js
const express = require('express');
const router = express.Router();
const maps = require('../controllers/mapsController');
const { authenticate } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const { applyScoping } = require('../middleware/scoping');

router.get('/dealers', authenticate, checkPermission('maps.view'), applyScoping(['Dealer']), maps.getDealerPins);
router.get('/heatmap', authenticate, checkPermission('maps.heatmap'), applyScoping(['Dealer']), maps.getHeatmap);
router.get('/regions', authenticate, checkPermission('maps.regions'), maps.getRegionsGeo);
router.get('/territories', authenticate, checkPermission('maps.regions'), applyScoping(['Territory']), maps.getTerritoriesGeo);

module.exports = router;
