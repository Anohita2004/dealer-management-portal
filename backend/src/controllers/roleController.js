const { Role, Permission, RolePermission } = require("../models");

module.exports = {
  // Create Role
  createRole: async (req, res) => {
    try {
      const { name, category, description } = req.body;

      const role = await Role.create({ name, category, description });

      res.json({ message: "Role created", role });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create role" });
    }
  },

  // Get all roles
  getRoles: async (req, res) => {
    try {
      const roles = await Role.findAll({
        include: {
          model: Permission,
          through: RolePermission,
        },
      });

      res.json(roles);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  },

  // Assign Permission to Role
  assignPermission: async (req, res) => {
    try {
      const { roleId, permissionId } = req.body;

      await RolePermission.create({ roleId, permissionId });

      res.json({ message: "Permission assigned to role" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to assign permission" });
    }
  }
};
