const { Region } = require("../models");

module.exports = {
  getRegions: async (req, res) => {
    try {
      const regions = await Region.findAll({
        order: [["name", "ASC"]],
      });

      res.json(regions);
    } catch (err) {
      console.error("Error fetching regions:", err);
      res.status(500).json({ error: "Failed to fetch regions" });
    }
  },
};
