// src/routes/teamRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

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
router.get('/', authenticate, getTeams);
router.post('/', authenticate, checkPermission('teams.manage'), createTeam);
router.get('/:id', authenticate, checkPermission('teams.view'), getTeam);
router.put('/:id', authenticate, checkPermission('teams.manage'), updateTeam);
router.delete('/:id', authenticate, checkPermission('teams.manage'), deleteTeam);

// Team member management
router.post('/:teamId/dealers', authenticate, checkPermission('teams.manage'), addDealerToTeam);
router.delete('/:teamId/dealers/:dealerId', authenticate, checkPermission('teams.manage'), removeDealerFromTeam);

module.exports = router;
