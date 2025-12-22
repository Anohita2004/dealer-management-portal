// src/routes/maps.js
const express = require('express');
const router = express.Router();
const maps = require('../controllers/mapsController');
const { authenticate, authorize } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const { applyScoping } = require('../middleware/scoping');

router.get('/dealers', authenticate, authorize('dealer_admin', 'dealer_staff', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin', 'super_admin', 'technical_admin'), checkPermission('maps.view'), applyScoping(['Dealer']), maps.getDealerPins);
router.get('/heatmap', authenticate, authorize('dealer_admin', 'dealer_staff', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin', 'super_admin', 'technical_admin'), checkPermission('maps.heatmap'), applyScoping(['Dealer']), maps.getHeatmap);
router.get('/regions', authenticate, authorize('dealer_admin', 'dealer_staff', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin', 'super_admin', 'technical_admin'), checkPermission('maps.regions'), maps.getRegionsGeo);
router.get('/territories', authenticate, authorize('dealer_admin', 'dealer_staff', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin', 'super_admin', 'technical_admin'), checkPermission('maps.regions'), applyScoping(['Territory']), maps.getTerritoriesGeo);

module.exports = router;
