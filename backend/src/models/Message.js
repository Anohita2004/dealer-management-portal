// backend/src/models/Message.js
const { DataTypes } = require("sequelize");

module.exports = (sequelize, DataTypes) => {

  const Message = sequelize.define(
    "Message",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      senderId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      recipientId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      subject: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("unread", "read"),
        defaultValue: "unread",
      },
messageType: {
  type: DataTypes.ENUM("chat", "system", "announcement"),
  defaultValue: "chat", // helps separate chat vs system messages
},

    },
    {
      tableName: "messages",
      timestamps: true,
    }
  );

  Message.associate = (models) => {
    Message.belongsTo(models.User, {
      foreignKey: "senderId",
      as: "sender",
    });
    Message.belongsTo(models.User, {
      foreignKey: "recipientId",
      as: "recipient",
    });
  };

  return Message;
};
