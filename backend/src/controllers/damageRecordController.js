// Controller for DamageRecord CRUD (basic)
const { DamageRecord } = require('../models');

module.exports = {
  async createDamageRecord(req, res) {
    try {
      const { goodsReceiptId, materialCode, quantity, reason, remarks } = req.body;
      const reportedBy = req.user.id;
      const record = await DamageRecord.create({
        goodsReceiptId,
        materialCode,
        quantity,
        reason,
        reportedBy,
        reportedAt: new Date(),
        status: 'pending',
        remarks
      });
      return res.status(201).json({ success: true, data: record });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
  async getDamageRecords(req, res) {
    try {
      const { goodsReceiptId } = req.query;
      const where = goodsReceiptId ? { goodsReceiptId } : {};
      const records = await DamageRecord.findAll({ where });
      return res.status(200).json({ success: true, data: records });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
  async updateDamageRecord(req, res) {
    try {
      const { id } = req.params;
      const { quantity, reason, status, remarks } = req.body;
      const record = await DamageRecord.findByPk(id);
      if (!record) return res.status(404).json({ success: false, message: 'Not found' });
      if (quantity) record.quantity = quantity;
      if (reason) record.reason = reason;
      if (status) record.status = status;
      if (remarks) record.remarks = remarks;
      await record.save();
      return res.status(200).json({ success: true, data: record });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
  async deleteDamageRecord(req, res) {
    try {
      const { id } = req.params;
      const record = await DamageRecord.findByPk(id);
      if (!record) return res.status(404).json({ success: false, message: 'Not found' });
      await record.destroy();
      return res.status(200).json({ success: true, message: 'Deleted' });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};
