const { Message, Dealer } = require('../models');

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

    res.status(201).json(msg);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
};
