// src/controllers/authController.js
const { User, Dealer, Role, AuditLog } = require("../models");
const { generateToken } = require("../utils/jwt");

// Legacy → canonical role mapping (same as middleware)
const LEGACY_ROLE_MAP = {
  admin: "super_admin",
  key_user: "technical_admin",
  tm: "territory_manager",
  am: "area_manager",
  sm: "regional_manager",
  dealer: "dealer_admin",
  accounts: "accounts_user",
  inventory: "inventory_user",
};

// -------------------------------
// LOGIN (Step 1 → Generate OTP)
// -------------------------------
// -------------------------------
// LOGIN (Step 1 → Generate OTP)
// -------------------------------
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log("🔐 Login attempt:", { username, hasPassword: !!password, bodyKeys: Object.keys(req.body) });
    
    if (!username || !password) {
      console.error("❌ Login failed: Missing username or password");
      return res.status(400).json({ error: "Username and password are required" });
    }

    const user = await User.findOne({
      where: { username },
      include: [{ model: Role, as: "roleDetails", required: false }],
    });

    if (!user) {
      console.error(`❌ Login failed: User not found - ${username}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    console.log(`✅ User found: ${username}, isActive: ${user.isActive}, isBlocked: ${user.isBlocked}`);
    
    if (!user.isActive || user.isBlocked) {
      console.error(`❌ Login failed: Account inactive/blocked - ${username}`);
      return res.status(403).json({ error: "Account inactive/blocked" });
    }

    const valid = await user.validatePassword(password);
    if (!valid) {
      console.error(`❌ Login failed for user ${username}: Invalid password`);
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    console.log(`✅ Password validated for user: ${username}`);

    // Generate OTP
    const otp = user.generateOTP();
    console.log("LOGIN OTP for user:", user.username, "=>", otp); // <-- log here
    await user.save();

    await AuditLog.create({
      userId: user.id,
      action: "LOGIN_OTP_GENERATED",
      entity: "User",
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.json({
      otpSent: true,
      userId: user.id,
      message: "OTP sent to email",
      otp: process.env.NODE_ENV === "development" ? otp : undefined,
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    console.error("❌ Login error message:", err.message);
    console.error("❌ Login error stack:", err.stack);
    return res.status(500).json({ 
      error: "Login failed",
      message: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
};

// ---------------------------------
// VERIFY OTP (Step 2 → Return Token)
// ---------------------------------
const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    
    if (!userId || !otp) {
      return res.status(400).json({ error: "UserId and OTP are required" });
    }

    const user = await User.findByPk(userId, {
      include: [
        { model: Dealer, as: "dealer", required: false },
        { model: Role, as: "roleDetails", required: false },
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

    // Normalize role name (same logic as authenticate middleware)
    const canonicalRole =
      user.roleDetails?.name ||
      LEGACY_ROLE_MAP[user.role] ||
      user.role ||
      null;

    const token = generateToken(user.id, user.roleId);
    console.log("🔑 Token generated:", { userId: user.id, roleId: user.roleId, tokenPreview: token.substring(0, 30) + "..." });

    await AuditLog.create({
      userId: user.id,
      action: "LOGIN_SUCCESS",
      entity: "User",
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: canonicalRole,
      roleId: user.roleId,
      regionId: user.regionId,
      areaId: user.areaId,
      territoryId: user.territoryId,
      dealerId: user.dealerId || (user.dealer ? user.dealer.id : null),
      dealer: user.dealer || null,
      isActive: user.isActive,
    };

    console.log("✅ OTP verified successfully for user:", user.username, "role:", canonicalRole);

    return res.json({
      token,
      user: userResponse,
    });

  } catch (err) {
    console.error("OTP error:", err);
    console.error("OTP error stack:", err.stack);
    return res.status(500).json({ 
      error: "OTP verification failed",
      message: process.env.NODE_ENV === "development" ? err.message : undefined
    });
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

const getMe = async (req, res) => {
  try {
    // req.user is already populated by authenticate middleware
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    console.log("✅ GET /api/auth/me - User authenticated:", req.user.username, "role:", req.user.role);
    
    return res.json({ user: req.user });
  } catch (err) {
    console.error("GetMe error:", err);
    console.error("GetMe error stack:", err.stack);
    return res.status(500).json({ error: "Failed to fetch user data" });
  }
};

module.exports = {
  login,
  verifyOTP,
  resetPassword,
  resetPasswordConfirm,
  getMe,
};
