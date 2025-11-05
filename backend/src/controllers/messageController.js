const { Message, Dealer } = require('../models');

// ========================= Get Messages =========================
exports.getManagerMessages = async (req, res) => {
  try {
    const { id, role } = req.user;

    const messages = await Message.findAll({
      where: { [role === 'dealer' ? 'dealerId' : 'managerId']: id },
      include: [{ model: Dealer, as: 'dealer', attributes: ['businessName'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json(messages);
  } catch (err) {
    console.error('Fetch messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// ========================= Send Message =========================
exports.sendManagerMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const { id, role } = req.user;

    const msg = await Message.create({
      senderId: id,
      receiverId,
      content,
      senderRole: role
    });

    // 🔌 SOCKET: Notify recipients
    const io = req.app.get('io');
    if (io) {
      if (role === 'dealer') {
        // Dealer → TM/AM
        io.to('role:tm').emit('message:new', msg);
        io.to('role:am').emit('message:new', msg);
      } else {
        // TM/AM/Admin → Dealer
        io.to(`user:${receiverId}`).emit('message:reply', msg);
      }
    }

    res.status(201).json(msg);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
};
