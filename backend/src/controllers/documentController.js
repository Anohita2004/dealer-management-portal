const { Document, Dealer, AuditLog } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ========================= Multer Storage Config =========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) cb(null, true);
    else cb(new Error('Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed'));
  }
});

// ========================= Get All Documents =========================
const getAllDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 10, dealerId, documentType } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (dealerId) where.dealerId = dealerId;
    if (documentType) where.documentType = documentType;
    if (req.user.role === 'dealer') where.dealerId = req.user.dealerId;

    const { count, rows } = await Document.findAndCountAll({
      where,
      include: [{ model: Dealer, as: 'dealer' }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      documents: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

// ========================= Upload Document =========================
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { documentType, description, dealerId } = req.body;

    const document = await Document.create({
      documentType,
      documentName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user.username,
      description,
      dealerId: req.user.role === 'dealer' ? req.user.dealerId : dealerId
    });

    await AuditLog.create({
      userId: req.user.id,
      action: 'UPLOAD_DOCUMENT',
      entity: 'Document',
      entityId: document.id,
      changes: { documentName: req.file.originalname, documentType },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // 🔌 Emit socket event to TM/AM dashboards
    const io = req.app.get('io');
    if (io) {
      io.to('role:tm').emit('document:new', { dealerId: document.dealerId });
      io.to('role:am').emit('document:new', { dealerId: document.dealerId });
    }

    res.status(201).json(document);
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
};

// ========================= Download Document =========================
const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const where = { id };
    if (req.user.role === 'dealer') where.dealerId = req.user.dealerId;

    const document = await Document.findOne({ where });
    if (!document) return res.status(404).json({ error: 'Document not found' });
    if (!fs.existsSync(document.filePath))
      return res.status(404).json({ error: 'File not found on server' });

    await AuditLog.create({
      userId: req.user.id,
      action: 'DOWNLOAD_DOCUMENT',
      entity: 'Document',
      entityId: document.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.download(document.filePath, document.documentName);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
};

// ========================= Delete Document =========================
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findByPk(id);
    if (!document) return res.status(404).json({ error: 'Document not found' });

    if (fs.existsSync(document.filePath)) fs.unlinkSync(document.filePath);
    await document.destroy();

    await AuditLog.create({
      userId: req.user.id,
      action: 'DELETE_DOCUMENT',
      entity: 'Document',
      entityId: document.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};

// ========================= Approve / Reject Document =========================
const approveDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;
    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ error: 'Invalid action' });

    const document = await Document.findByPk(id);
    if (!document) return res.status(404).json({ error: 'Document not found' });

    document.status = action === 'approve' ? 'approved' : 'rejected';
    document.approvedBy = req.user.id;
    document.approvedAt = new Date();
    document.rejectionReason = action === 'reject' ? reason : null;
    await document.save();

    await AuditLog.create({
      userId: req.user.id,
      action: action === 'approve' ? 'APPROVE_DOCUMENT' : 'REJECT_DOCUMENT',
      entity: 'Document',
      entityId: document.id,
      changes: { status: document.status, reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // 🔌 Emit socket updates
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${document.dealerId}`).emit('document:update', {
        id: document.id,
        status: document.status,
        fileName: document.documentName,
        message:
          document.status === 'approved'
            ? `✅ Your document "${document.documentName}" has been approved.`
            : `❌ Your document "${document.documentName}" was rejected. Reason: ${document.rejectionReason || 'N/A'}`
      });

      io.to('role:tm').emit('document:pending:update');
      io.to('role:am').emit('document:pending:update');
    }

    res.json({ message: `Document ${document.status}`, document });
  } catch (err) {
    console.error('Approve document error:', err);
    res.status(500).json({ error: 'Failed to update document status' });
  }
};

module.exports = {
  upload,
  getAllDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  approveDocument
};
