// src/middleware/auth.js

const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const verifyAsync = promisify(jwt.verify);

// Load all models properly
const { User, Role, Dealer } = require("../models");

// Legacy → canonical role mapping to smooth transition while we finish migrations
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

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || req.headers.Authorization;
    if (!header)
      return res.status(401).json({ error: "Authorization header missing" });

    const parts = header.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer")
      return res.status(401).json({ error: "Invalid authorization format" });

    const token = parts[1];

    let decoded;
    try {
      decoded = await verifyAsync(token, process.env.JWT_SECRET || "secret");
    } catch (err) {
      console.error("Token verify error:", err);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userId = decoded.userId || decoded.id || decoded.sub;
    if (!userId)
      return res
        .status(401)
        .json({ error: "Invalid token payload (no userId)" });

    // ❌ OLD (WRONG): created circular import
    // { model: require('../models').Dealer }

    // ✅ NEW (CORRECT)
    const user = await User.findByPk(userId, {
      include: [
        { model: Role, as: "roleDetails" },
        { model: Dealer, as: "dealer" },
      ],
    });

    if (!user) return res.status(401).json({ error: "User not found" });

    // Normalize role name
    const canonicalRole =
      user.roleDetails?.name ||
      LEGACY_ROLE_MAP[user.role] ||
      user.role ||
      null;

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      roleId: user.roleId,
      role: canonicalRole,
      roleDetails: user.roleDetails ? { name: canonicalRole, id: user.roleDetails.id } : null,
      dealerId: user.dealerId || user.dealer?.id || null,
      isActive: user.isActive,
      isBlocked: user.isBlocked,
      regionId: user.regionId || null,
      areaId: user.areaId || null,
      territoryId: user.territoryId || null,
    };
console.log("AUTH USER DEBUG:", {
  id: req.user.id,
  username: req.user.username,
  role: req.user.role,
  roleDetails: req.user.roleDetails,
  regionId: req.user.regionId,
  areaId: req.user.areaId,
  territoryId: req.user.territoryId,
  dealerId: req.user.dealerId
});


    return next();
  } catch (err) {
    console.error("Authentication error:", err);
    return res.status(500).json({ error: "Authentication failed" });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ error: "Not authenticated" });

    if (allowedRoles.length === 0) return next();

    const userRole = req.user.role?.toLowerCase();
    const allowed = allowedRoles.map((r) => r.toLowerCase());

    if (!allowed.includes(userRole)) {
      return res
        .status(403)
        .json({ error: "Forbidden: insufficient permissions" });
    }

    next();
  };
};

module.exports = { authenticate, authorize };
