// src/models/Notification.js
module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    // Optional sender (the user who triggered the event)
    senderId: { type: DataTypes.UUID, allowNull: true },

    // Optional recipient (null if broadcasted to a role)
    recipientId: { type: DataTypes.UUID, allowNull: true },

    // Role-based broadcast target (e.g., 'manager', 'dealer', 'admin')
    recipientRole: { type: DataTypes.STRING, allowNull: true },

    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },

    // Category: 'document', 'pricing', 'chat', etc.
    type: { type: DataTypes.STRING, allowNull: true },

    // Related record ID (documentId, pricingId, etc.)
    relatedId: { type: DataTypes.INTEGER, allowNull: true },

    isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  });

  return Notification;
};
