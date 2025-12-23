// src/routes/teamRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');
const { applyScope } = require('../middleware/rbac');

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
router.get('/', authenticate, checkPermission('teams.view'), applyScope(['Dealer']), getTeams);
router.post('/', authenticate, checkPermission('teams.manage'), applyScope(['Dealer']), createTeam);
router.get('/:id', authenticate, checkPermission('teams.view'), applyScope(['Dealer']), getTeam);
router.put('/:id', authenticate, checkPermission('teams.manage'), applyScope(['Dealer']), updateTeam);
router.delete('/:id', authenticate, checkPermission('teams.manage'), applyScope(['Dealer']), deleteTeam);

// Team member management
router.post('/:teamId/dealers', authenticate, checkPermission('teams.manage'), applyScope(['Dealer']), addDealerToTeam);
router.delete('/:teamId/dealers/:dealerId', authenticate, checkPermission('teams.manage'), applyScope(['Dealer']), removeDealerFromTeam);

module.exports = router;
