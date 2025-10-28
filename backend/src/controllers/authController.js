const { User, Dealer, AuditLog } = require('../models');
const { generateToken } = require('../utils/jwt');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive || user.isBlocked) {
      return res.status(403).json({ error: 'Account is inactive or blocked' });
    }

    const isValidPassword = await user.validatePassword(password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const otp = user.generateOTP();
    await user.save();

    await AuditLog.create({
      userId: user.id,
      action: 'LOGIN_OTP_GENERATED',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ 
      message: 'OTP sent successfully',
      userId: user.id,
      otpSent: true
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findByPk(userId, {
      include: [{ model: Dealer, as: 'dealer' }]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.validateOTP(otp)) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    user.otp = null;
    user.otpExpiry = null;
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user.id, user.role);

    await AuditLog.create({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        dealer: user.dealer
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'OTP verification failed' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { username, email } = req.body;

    const user = await User.findOne({ where: { username, email } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const otp = user.generateOTP();
    await user.save();

    await AuditLog.create({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ 
      message: 'Password reset OTP sent',
      userId: user.id
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
};

const resetPasswordConfirm = async (req, res) => {
  try {
    const { userId, otp, newPassword } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.validateOTP(otp)) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    user.password = newPassword;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    await AuditLog.create({
      userId: user.id,
      action: 'PASSWORD_RESET_SUCCESS',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset confirm error:', error);
    res.status(500).json({ error: 'Password reset confirmation failed' });
  }
};

module.exports = {
  login,
  verifyOTP,
  resetPassword,
  resetPasswordConfirm
};
