// Controller for CostCenter CRUD (basic)
const { CostCenter } = require('../models');

module.exports = {
  async createCostCenter(req, res) {
    try {
      const { code, name, description, isActive } = req.body;
      const costCenter = await CostCenter.create({ code, name, description, isActive });
      return res.status(201).json({ success: true, data: costCenter });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
  async getCostCenters(req, res) {
    try {
      const costCenters = await CostCenter.findAll();
      return res.status(200).json({ success: true, data: costCenters });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
  async updateCostCenter(req, res) {
    try {
      const { id } = req.params;
      const { code, name, description, isActive } = req.body;
      const costCenter = await CostCenter.findByPk(id);
      if (!costCenter) return res.status(404).json({ success: false, message: 'Not found' });
      if (code) costCenter.code = code;
      if (name) costCenter.name = name;
      if (description) costCenter.description = description;
      if (typeof isActive === 'boolean') costCenter.isActive = isActive;
      await costCenter.save();
      return res.status(200).json({ success: true, data: costCenter });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
  async deleteCostCenter(req, res) {
    try {
      const { id } = req.params;
      const costCenter = await CostCenter.findByPk(id);
      if (!costCenter) return res.status(404).json({ success: false, message: 'Not found' });
      await costCenter.destroy();
      return res.status(200).json({ success: true, message: 'Deleted' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};
