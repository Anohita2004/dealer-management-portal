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
        { model: User, as: "sender", attributes: ["id", "username", "role"] },
        { model: User, as: "recipient", attributes: ["id", "username", "role"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// 📨 Send a new message
exports.sendMessage = async (req, res) => {
  try {
    const { recipientId, body, subject } = req.body;
    const senderId = req.user.id;

    if (!recipientId || !body) {
      return res.status(400).json({ error: "recipientId and body are required" });
    }

    const message = await Message.create({
      senderId,
      recipientId,
      subject: subject || "Chat",
      body,
      status: "unread",
    });

    const io = req.app.get("io");
    if (io) io.to(`user:${recipientId}`).emit("message:new", message);

    // Save notification
    await Notification.create({
      senderId,
      recipientId,
      title: "New Message Received",
      message: `${req.user.username}: ${body.substring(0, 60)}...`,
      type: "chat",
      relatedId: message.id,
    });

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
    res.status(500).json({ error: "Failed to send message" });
  }
};

// ✅ Mark one or multiple messages as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params; // can be a single message ID or comma-separated IDs
    const userId = req.user.id;

    const ids = id.split(","); // allow multiple IDs
    const messages = await Message.findAll({
      where: {
        id: { [Op.in]: ids },
        recipientId: userId,
        status: "unread",
      },
    });

    if (!messages.length) {
      return res.status(404).json({ error: "No unread messages found" });
    }

    await Promise.all(messages.map((msg) => (msg.status = "read", msg.save())));
    res.json({ messages });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
};

// 💬 Get conversation between current user and partner
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
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
};
