const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);
router.post('/reset-password-confirm', authController.resetPasswordConfirm);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
