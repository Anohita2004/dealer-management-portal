const { Message, User } = require("../models");
const { Op } = require("sequelize");

// 📩 Get messages for the logged-in user
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.id;

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: userId },
          { recipientId: userId }
        ]
      },
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "username", "email", "role"] // ✅ username instead of name
        },
        {
          model: User,
          as: "recipient",
          attributes: ["id", "username", "email", "role"] // ✅ username instead of name
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: error.message });
  }
};

// 📨 Send a new message
exports.sendMessage = async (req, res) => {
  try {
    const { recipientId, subject, body } = req.body;
    const senderId = req.user.id;

    const message = await Message.create({
      senderId,
      recipientId,
      subject,
      body,
      status: "unread"
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ Mark a message as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findByPk(id);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    message.status = "read";
    await message.save();

    res.json({ message });
  } catch (error) {
    console.error("Error marking message as read:", error);
    res.status(500).json({ error: error.message });
  }
};
