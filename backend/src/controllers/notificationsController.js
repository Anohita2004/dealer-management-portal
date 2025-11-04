const { Dealer, Document } = require('../models');
const { Op } = require('sequelize');

exports.getManagerNotifications = async (req, res) => {
  try {
    const { role, region, territory } = req.user; // assume TM/AM has these fields

    const whereDealer = {};
    if (region) whereDealer.region = region;
    if (territory) whereDealer.territory = territory;

    const expiringLicenses = await Dealer.count({
      where: {
        ...whereDealer,
        licenses: { [Op.ne]: null },
        updatedAt: { [Op.lt]: new Date(Date.now() - 330 * 24 * 60 * 60 * 1000) } // licenses older than ~11 months
      }
    });

    const pendingDocs = await Document.count({
      where: { status: 'pending', ...whereDealer }
    });

    res.json({
      expiringLicenses,
      pendingDocs,
      message: 'Notifications fetched successfully'
    });
  } catch (error) {
    console.error('Manager notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};
