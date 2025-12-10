// src/models/Notification.js
module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define("Notification", {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },

    senderId: { type: DataTypes.UUID, allowNull: true },       // person who triggered event
    recipientId: { type: DataTypes.UUID, allowNull: true },    // sends to specific user
    recipientRole: { type: DataTypes.STRING, allowNull: true },// OR role-wide

    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },

    type: { type: DataTypes.STRING, allowNull: true },         // 'document', 'pricing', etc.
    relatedId: { type: DataTypes.UUID, allowNull: true },

    isRead: { type: DataTypes.BOOLEAN, defaultValue: false }
  });

  // Add correct relationships
  Notification.associate = (models) => {
    Notification.belongsTo(models.User, {
      foreignKey: "senderId",
      as: "sender"
    });

    Notification.belongsTo(models.User, {
      foreignKey: "recipientId",
      as: "recipient"
    });
  };

  return Notification;
};
