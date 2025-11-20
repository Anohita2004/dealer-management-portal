// src/controllers/authController.js
const { User, Dealer, Role, AuditLog } = require("../models");
const { generateToken } = require("../utils/jwt");

// -------------------------------
// LOGIN (Step 1 → Generate OTP)
// -------------------------------
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      where: { username },
      include: [{ model: Role, as: "roleDetails" }],
    });

    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (!user.isActive || user.isBlocked)
      return res.status(403).json({ error: "Account inactive/blocked" });

    const valid = await user.validatePassword(password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    // Generate OTP
    const otp = user.generateOTP();
    await user.save();

    await AuditLog.create({
      userId: user.id,
      action: "LOGIN_OTP_GENERATED",
      entity: "User",
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json({ message: "OTP sent", userId: user.id, otpSent: true });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
};

// ---------------------------------
// VERIFY OTP (Step 2 → Return Token)
// ---------------------------------
const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findByPk(userId, {
      include: [
        { model: Dealer, as: "dealer" },
        { model: Role, as: "roleDetails" },
      ],
    });

    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.validateOTP(otp))
      return res.status(401).json({ error: "Invalid or expired OTP" });

    // clear otp
    user.otp = null;
    user.otpExpiry = null;
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user.id, user.roleId);

    await AuditLog.create({
      userId: user.id,
      action: "LOGIN_SUCCESS",
      entity: "User",
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json({
  token,
  user: {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.roleDetails?.name,
    roleId: user.roleId,
    dealerId: user.dealerId || (user.dealer ? user.dealer.id : null),
    dealer: user.dealer || null,
  },
});

  } catch (err) {
    console.error("OTP error:", err);
    return res.status(500).json({ error: "OTP verification failed" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { username, email } = req.body;

    const user = await User.findOne({ where: { username, email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const otp = user.generateOTP();
    await user.save();

    await AuditLog.create({
      userId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      entity: "User",
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json({ message: "Password reset OTP sent", userId: user.id });
  } catch (err) {
    console.error("Password reset error:", err);
    return res.status(500).json({ error: "Password reset failed" });
  }
};

const resetPasswordConfirm = async (req, res) => {
  try {
    const { userId, otp, newPassword } = req.body;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.validateOTP(otp))
      return res.status(401).json({ error: "Invalid or expired OTP" });

    user.password = newPassword;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    await AuditLog.create({
      userId: user.id,
      action: "PASSWORD_RESET_SUCCESS",
      entity: "User",
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Password reset confirm error:", err);
    return res.status(500).json({ error: "Password reset failed" });
  }
};

module.exports = {
  login,
  verifyOTP,
  resetPassword,
  resetPasswordConfirm,
};
