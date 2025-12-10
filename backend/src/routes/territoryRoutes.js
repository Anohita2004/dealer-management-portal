// src/routes/territoryRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

const {
  createTerritory,
  getTerritories,
  getTerritory,
  updateTerritory,
  deleteTerritory
} = require('../controllers/territoryController');

// Protected routes
router.get('/', authenticate, getTerritories);
router.post('/', authenticate, checkPermission('territories.manage'), createTerritory);
router.get('/:id', authenticate, checkPermission('territories.view'), getTerritory);
router.put('/:id', authenticate, checkPermission('territories.manage'), updateTerritory);
router.delete('/:id', authenticate, checkPermission('territories.manage'), deleteTerritory);

module.exports = router;
