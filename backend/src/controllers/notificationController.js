// src/controllers/notificationController.js
const { Notification, User, sequelize } = require('../models');
const { Op } = require('sequelize');

// Create notification for a user or role
const createNotification = async (req, res) => {
  try {
    const {
      userId,
      roleName,
      title,
      message,
      type = 'info',
      priority = 'normal',
      actionUrl,
      data
    } = req.body;

    let notifications = [];

    if (userId) {
      // Single user notification
      const notification = await Notification.create({
        userId,
        title,
        message,
        type,
        priority,
        actionUrl,
        data: data || {},
        read: false
      });
      notifications.push(notification);

      // Send real-time notification via Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${userId}`).emit('notification', {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          actionUrl: notification.actionUrl,
          createdAt: notification.createdAt
        });
      }
    } else if (roleName) {
      // Role-based notification - send to all users with this role
      const users = await User.findAll({
        where: { roleId: roleName }, // Assuming roleId is used as role name
        attributes: ['id']
      });

      const notificationPromises = users.map(user =>
        Notification.create({
          userId: user.id,
          title,
          message,
          type,
          priority,
          actionUrl,
          data: data || {},
          read: false
        })
      );

      notifications = await Promise.all(notificationPromises);

      // Send to all users in role
      const io = req.app.get('io');
      if (io) {
        users.forEach(user => {
          const userNotifications = notifications.filter(n => n.userId === user.id);
          io.to(`user:${user.id}`).emit('notifications', userNotifications.map(n => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type,
            priority: n.priority,
            actionUrl: n.actionUrl,
            createdAt: n.createdAt
          })));
        });
      }
    }

    res.status(201).json({
      message: 'Notifications created successfully',
      count: notifications.length,
      notifications
    });
  } catch (err) {
    console.error('createNotification:', err);
    res.status(500).json({ error: 'Failed to create notification' });
  }
};

// Get user notifications
const getUserNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 50, unreadOnly = false } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    const where = { userId };
    if (unreadOnly === 'true') {
      where.read = false;
    }

    const notifications = await Notification.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await Notification.count({ where });

    res.json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('getUserNotifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      where: { id, userId }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await notification.update({ read: true, readAt: new Date() });

    res.json({ message: 'Notification marked as read', notification });
  } catch (err) {
    console.error('markAsRead:', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const updated = await Notification.update(
      { read: true, readAt: new Date() },
      { where: { userId, read: false } }
    );

    res.json({ message: `${updated[0]} notifications marked as read` });
  } catch (err) {
    console.error('markAllAsRead:', err);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const deleted = await Notification.destroy({
      where: { id, userId }
    });

    if (deleted === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    console.error('deleteNotification:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

// Get unread count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await Notification.count({
      where: { userId, read: false }
    });

    res.json({ unreadCount: count });
  } catch (err) {
    console.error('getUnreadCount:', err);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

// Send approval notification (workflow helper)
const sendApprovalNotification = async (userId, entityType, entityId, action, approverName) => {
  const messages = {
    order: {
      approve: `Your order #${entityId} has been approved by ${approverName}`,
      reject: `Your order #${entityId} has been rejected by ${approverName}`
    },
    payment: {
      approve: `Your payment request #${entityId} has been approved by ${approverName}`,
      reject: `Your payment request #${entityId} has been rejected by ${approverName}`
    },
    document: {
      approve: `Your document submission #${entityId} has been approved by ${approverName}`,
      reject: `Your document submission #${entityId} has been rejected by ${approverName}`
    }
  };

  const title = `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${action}d`;
  const message = messages[entityType]?.[action] || `${entityType} #${entityId} has been ${action}d`;

  await Notification.create({
    userId,
    title,
    message,
    type: action === 'approve' ? 'success' : 'warning',
    priority: 'high',
    actionUrl: `/${entityType}s/${entityId}`,
    data: { entityType, entityId, action, approverName }
  });

  return true;
};

// Send escalation notification
const sendEscalationNotification = async (userId, entityType, entityId, slaDays) => {
  const title = `SLA Escalation: ${entityType} #${entityId}`;
  const message = `${entityType} #${entityId} has exceeded ${slaDays} days SLA. Immediate attention required.`;

  await Notification.create({
    userId,
    title,
    message,
    type: 'error',
    priority: 'urgent',
    actionUrl: `/${entityType}s/${entityId}`,
    data: { entityType, entityId, escalation: true, slaDays }
  });

  return true;
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  sendApprovalNotification,
  sendEscalationNotification
};
