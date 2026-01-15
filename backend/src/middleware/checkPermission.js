const { Role, Permission } = require("../models");

module.exports = (permissionKey) => {
  return async (req, res, next) => {
    try {
      const roleId = req.user?.roleId;
      if (!roleId) return res.status(401).json({ error: "Unauthorized – No role found" });

      // System Roles bypass (Roles that have inherent access to specific modules)
      const bypassRoles = ['super_admin', 'admin', 'finance_admin', 'accounts_user'];
      if (bypassRoles.includes(req.user.role)) {
        return next();
      }

      const hasPermission = await Permission.findOne({
        where: { key: permissionKey },
        include: [
          {
            model: Role,
            as: "roles",                 // 🔥 REQUIRED ALIAS FIX
            where: { id: roleId },
            attributes: ["id"],
            through: { attributes: [] }
          }
        ]
      });

      if (!hasPermission) {
        return res.status(403).json({
          error: "Access Denied — Missing Permission",
          requiredPermission: permissionKey,
          userRole: req.user.role || req.user.roleDetails?.name,
          roleId: req.user.roleId
        });
      }

      next();

    } catch (err) {
      console.error("Permission middleware error:", err);
      return res.status(500).json({ error: "Internal permission validation failed" });
    }
  };
};
