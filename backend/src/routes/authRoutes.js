const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Logging middleware for login route
router.post('/login', (req, res, next) => {
  console.log('📥 Login request received:', {
    method: req.method,
    path: req.path,
    body: { username: req.body?.username, hasPassword: !!req.body?.password },
    headers: {
      'content-type': req.headers['content-type'],
      'origin': req.headers.origin
    }
  });
  next();
}, authController.login);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);
router.post('/reset-password-confirm', authController.resetPasswordConfirm);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
