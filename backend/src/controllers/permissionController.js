const { Permission } = require("../models");

module.exports = {
  createPermission: async (req, res) => {
    try {
      const { key, description } = req.body;

      const permission = await Permission.create({ key, description });

      res.json({ message: "Permission created", permission });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create permission" });
    }
  },

  getPermissions: async (req, res) => {
    try {
      const permissions = await Permission.findAll();
      res.json(permissions);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  },
};
