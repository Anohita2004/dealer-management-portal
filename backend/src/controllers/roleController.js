// src/controllers/roleController.js
const { Role, Permission, RolePermission, sequelize } = require("../models");

module.exports = {
  // Create Role
  createRole: async (req, res) => {
    try {
      const { name, category, description } = req.body;

      const role = await Role.create({ name, category, description });

      res.json({ message: "Role created", role });
    } catch (err) {
      console.error("createRole:", err);
      res.status(500).json({ error: "Failed to create role" });
    }
  },

  // Get all roles (with permissions)
  getRoles: async (req, res) => {
    try {
      const roles = await Role.findAll({
        include: [
          {
            model: Permission,
            as: "permissions",
            through: { attributes: [] }, // hide junction table
          },
        ],
        order: [["id", "ASC"]],
      });

      res.json(roles);
    } catch (err) {
      console.error("getRoles:", err);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  },

  // Assign a single permission to a role (keeps old behaviour but implemented safely)
  assignPermission: async (req, res) => {
    try {
      const { roleId, permissionId } = req.body;

      const role = await Role.findByPk(roleId);
      const permission = await Permission.findByPk(permissionId);

      if (!role || !permission) {
        return res.status(404).json({ error: "Role or Permission not found" });
      }

      // Use association helper to avoid duplicates
      await role.addPermission(permission);

      res.json({ message: "Permission assigned to role" });
    } catch (err) {
      console.error("assignPermission:", err);
      res.status(500).json({ error: "Failed to assign permission" });
    }
  },

  // NEW: Replace all permissions for a role (atomic)
  updateRolePermissions: async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { roleId } = req.params;
      const { permissionIds } = req.body;

      if (!Array.isArray(permissionIds)) {
        await t.rollback();
        return res
          .status(400)
          .json({ error: "permissionIds must be an array of integers" });
      }

      const role = await Role.findByPk(roleId, { transaction: t });
      if (!role) {
        await t.rollback();
        return res.status(404).json({ error: "Role not found" });
      }

      // Option A: Use Sequelize association helper (clean & will sync junction table)
      // This will remove existing associations and add the provided ones.
      await role.setPermissions(permissionIds, { transaction: t });

      // Fetch updated role (with permissions)
      const updatedRole = await Role.findByPk(roleId, {
        include: [{ model: Permission, as: "permissions", through: { attributes: [] } }],
        transaction: t,
      });

      await t.commit();
      res.json({
        message: "Permissions updated successfully",
        role: updatedRole,
      });
    } catch (err) {
      await t.rollback();
      console.error("updateRolePermissions:", err);
      res.status(500).json({ error: "Unable to update role permissions" });
    }
  },
};
