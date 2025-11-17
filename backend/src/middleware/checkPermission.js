const { RolePermission, Permission } = require("../models");

module.exports = (permissionKey) => {
  return async (req, res, next) => {
    try {
      const roleId = req.user.roleId;

      const match = await Permission.findOne({
        where: { key: permissionKey },
        include: {
          model: RolePermission,
          where: { roleId }
        }
      });

      if (!match) {
        return res.status(403).json({ error: "Access denied: Permission missing" });
      }

      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Permission check failed" });
    }
  };
};
