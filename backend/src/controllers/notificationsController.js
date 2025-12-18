const { Notification, Dealer, Document } = require("../models");
const { Op } = require("sequelize");

/* =====================================================================
   1) MANAGER LIVE DASHBOARD SNAPSHOT (NOT LIST)
=====================================================================*/
exports.getManagerNotifications = async (req, res) => {
  try {
    const { region, territory, id } = req.user;
    const where = {};
    if (region) where.region = region;
    if (territory) where.territory = territory;

    const expiringLicenses = await Dealer.count({
      where: {
        ...where,
        licenses: { [Op.ne]: null },
        updatedAt: { [Op.lt]: new Date(Date.now() - (330 * 24 * 60 * 60 * 1000)) }
      }
    });

    const pendingDocs = await Document.count({
      where: { status: "pending", ...where }
    });

    const summary = { expiringLicenses, pendingDocs };

    req.app.get("io")?.to(`user:${id}`).emit("notification:update", summary);
    return res.json(summary);

  } catch (err) {
    console.error("Manager Notification Error:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

/* =====================================================================
   2) User — GET Notifications List
=====================================================================*/
exports.getUserNotifications = async (req, res) => {
  try {
    const { id, role } = req.user;

    const notes = await Notification.findAll({
      where: {
        [Op.or]: [
          { recipientId: id },      // user-specific
          { recipientRole: role },  // role broadcast
        ]
      },
      order: [["createdAt", "DESC"]],
      limit: 50
    });

    res.json({ notifications: notes });
  } catch (err) {
    console.error("getUserNotifications ERROR:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};


/* =====================================================================
   3) Create Notification (Admin / System)
=====================================================================*/
exports.createNotification = async (req, res) => {
  try {
    const note = await Notification.create(req.body);

    // Push live to recipient channel
    req.app.get("io")?.to(`user:${note.recipientId}`).emit("notification:new", note);

    res.json({ message: "Notification created", note });

  } catch (err) {
    console.error("Create Notification Error:", err);
    res.status(500).json({ error: "Failed to create notification" });
  }
};

/* =====================================================================
   4) Mark Single Notification Read
=====================================================================*/
exports.markAsRead = async (req, res) => {
  try {
    const note = await Notification.findByPk(req.params.id);
    if (!note) return res.status(404).json({ error: "Not found" });

    await note.update({ isRead: true });
    res.json({ message: "Marked as read" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update notification" });
  }
};

/* =====================================================================
   5) Mark ALL as read
=====================================================================*/
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { recipientId: req.user.id } }
    );

    res.json({ message: "All marked as read" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark all read" });
  }
};

/* =====================================================================
   6) Delete Notification
=====================================================================*/
exports.deleteNotification = async (req, res) => {
  try {
    await Notification.destroy({ where: { id: req.params.id }});
    res.json({ message: "Notification deleted" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete notification" });
  }
};

/* =====================================================================
   7) Unread Count
=====================================================================*/
exports.getUnreadCount = async (req, res) => {
  try {
    const unread = await Notification.count({
      where: { recipientId: req.user.id, isRead: false }
    });

    res.json({ unread });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get unread count" });
  }
};
