const { Notification,Dealer, Document } = require('../models');
const { Op } = require('sequelize');

// ========================= Get Manager Notifications =========================
exports.getManagerNotifications = async (req, res) => {
  try {
    const { role, region, territory, id } = req.user;
    const whereDealer = {};
    if (region) whereDealer.region = region;
    if (territory) whereDealer.territory = territory;

    const expiringLicenses = await Dealer.count({
      where: {
        ...whereDealer,
        licenses: { [Op.ne]: null },
        updatedAt: { [Op.lt]: new Date(Date.now() - 330 * 24 * 60 * 60 * 1000) } // older than 11 months
      }
    });

    const pendingDocs = await Document.count({
      where: { status: 'pending', ...whereDealer }
    });

    const data = {
      expiringLicenses,
      pendingDocs,
      message: 'Notifications fetched successfully'
    };

    // 🔌 SOCKET: emit real-time update to TM/AM dashboard
    const io = req.app.get('io');
    if (io) io.to(`user:${id}`).emit('notification:update', data);

    res.json(data);
  } catch (error) {
    console.error('Manager notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};
// src/controllers/notificationController.js

// ========================= Manager Snapshot Notifications =========================
exports.getManagerNotifications = async (req, res) => {
  try {
    const { role, region, territory, id } = req.user;
    const whereDealer = {};
    if (region) whereDealer.region = region;
    if (territory) whereDealer.territory = territory;

    const expiringLicenses = await Dealer.count({
      where: {
        ...whereDealer,
        licenses: { [Op.ne]: null },
        updatedAt: { [Op.lt]: new Date(Date.now() - 330 * 24 * 60 * 60 * 1000) },
      },
    });

    const pendingDocs = await Document.count({
      where: { status: 'pending', ...whereDealer },
    });

    const summary = {
      expiringLicenses,
      pendingDocs,
      message: 'Notifications fetched successfully',
    };

    const io = req.app.get('io');
    if (io) io.to(`user:${id}`).emit('notification:update', summary);

    res.json(summary);
  } catch (error) {
    console.error('Manager notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// ========================= Real Notification CRUD =========================
exports.getUserNotifications = async (req, res) => {
  try {
    const { id, role } = req.user;
    const where = {
      [Op.or]: [
        { recipientId: id },
        { recipientRole: role },
      ],
    };

    const notes = await Notification.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    res.json({ notifications: notes });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const note = await Notification.findByPk(id);
    if (!note) return res.status(404).json({ error: 'Notification not found' });

    await note.update({ isRead: true });
    res.json({ message: 'Notification marked as read', note });
  } catch (err) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};
