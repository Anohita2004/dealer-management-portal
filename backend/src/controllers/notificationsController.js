const { Dealer, Document } = require('../models');
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
