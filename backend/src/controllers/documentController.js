const { Document, Dealer, AuditLog } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed'));
  }
});

const getAllDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 10, dealerId, documentType } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (dealerId) where.dealerId = dealerId;
    if (documentType) where.documentType = documentType;

    if (req.user.role === 'dealer') {
      where.dealerId = req.user.dealerId;
    }

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

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

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

    res.status(201).json(document);
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
};

const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const where = { id };

    if (req.user.role === 'dealer') {
      where.dealerId = req.user.dealerId;
    }

    const document = await Document.findOne({ where });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

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

const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findByPk(id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

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

module.exports = {
  getAllDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  upload
};
