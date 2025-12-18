const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const taskController = require('../controllers/taskController');

router.get('/', authenticate, taskController.getMyTasks);

module.exports = router;

