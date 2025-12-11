// src/routes/teamRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const { applyScoping } = require('../middleware/scoping');

const {
  createTeam,
  getTeams,
  getTeam,
  addDealerToTeam,
  removeDealerFromTeam,
  updateTeam,
  deleteTeam
} = require('../controllers/teamController');

// Team CRUD routes
router.get('/', authenticate, checkPermission('teams.view'), applyScoping(['Dealer']), getTeams);
router.post('/', authenticate, checkPermission('teams.manage'), applyScoping(['Dealer']), createTeam);
router.get('/:id', authenticate, checkPermission('teams.view'), applyScoping(['Dealer']), getTeam);
router.put('/:id', authenticate, checkPermission('teams.manage'), applyScoping(['Dealer']), updateTeam);
router.delete('/:id', authenticate, checkPermission('teams.manage'), applyScoping(['Dealer']), deleteTeam);

// Team member management
router.post('/:teamId/dealers', authenticate, checkPermission('teams.manage'), applyScoping(['Dealer']), addDealerToTeam);
router.delete('/:teamId/dealers/:dealerId', authenticate, checkPermission('teams.manage'), applyScoping(['Dealer']), removeDealerFromTeam);

module.exports = router;
