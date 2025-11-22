const { Message, User, Notification } = require("../models");
const { Op } = require("sequelize");

// 📩 Get all messages for the logged-in user
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user.id;

    const messages = await Message.findAll({
      where: {
        [Op.or]: [{ senderId: userId }, { recipientId: userId }],
      },
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "username", "email", "role"],
        },
        {
          model: User,
          as: "recipient",
          attributes: ["id", "username", "email", "role"],
        },
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

    // Create the message
    const message = await Message.create({
      senderId,
      recipientId,
      subject: subject || "Chat",
      body,
      status: "unread",
    });

    const io = req.app.get("io");

    // 1️⃣ Real-time message push to recipient
    if (io) io.to(`user:${recipientId}`).emit("message:new", message);

    // 2️⃣ Save persistent notification
    await Notification.create({
      senderId,
      recipientId,
      title: "New Message Received",
      message: `${req.user.username}: ${body.substring(0, 60)}...`,
      type: "chat",
      relatedId: message.id,
    });

    // 3️⃣ Emit a "notification" event to recipient
    if (io) {
      io.to(`user:${recipientId}`).emit("notification", {
        title: "New Message Received",
        message: `${req.user.username}: ${body.substring(0, 60)}...`,
        type: "chat",
      });
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ Mark message as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findByPk(id);

    if (!message) return res.status(404).json({ error: "Message not found" });

    message.status = "read";
    await message.save();

    res.json({ message });
  } catch (error) {
    console.error("Error marking message as read:", error);
    res.status(500).json({ error: error.message });
  }
};

// 💬 Get conversation between two users (Dealer ↔ Manager)
exports.getConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { partnerId } = req.params;

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: userId, recipientId: partnerId },
          { senderId: partnerId, recipientId: userId },
        ],
      },
      include: [
        { model: User, as: "sender", attributes: ["id", "username", "role"] },
        { model: User, as: "recipient", attributes: ["id", "username", "role"] },
      ],
      order: [["createdAt", "ASC"]],
    });

    res.json({ messages });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ error: error.message });
  }
};

