// =====================================================================
// DOCUMENT CONTROLLER (Multi-Stage Workflow Integrated)
// =====================================================================
const { Document, Dealer, AuditLog, Notification } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { nextStage, isApproverForStage } = require("../utils/approvalEngine");

// =====================================================================
// MULTER STORAGE CONFIG
// =====================================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /pdf|doc|docx|jpg|jpeg|png/;
    const isExt = allowed.test(path.extname(file.originalname).toLowerCase());
    const isMime = allowed.test(file.mimetype);

    if (isExt && isMime) cb(null, true);
    else cb(new Error("Only PDF, DOC, DOCX, JPG, JPEG, PNG allowed"));
  },
});

// =====================================================================
// GET ALL DOCUMENTS
// =====================================================================
const getAllDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 10, dealerId, documentType } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (dealerId) where.dealerId = dealerId;
    if (documentType) where.documentType = documentType;

    // Apply scoping first
    if (req.scope?.dealers) {
      Object.assign(where, req.scope.dealers);
    } else if (["dealer_admin", "dealer_staff", "dealer"].includes(req.user.role)) {
      where.dealerId = req.user.dealerId;
    }

    const { count, rows } = await Document.findAndCountAll({
      where,
      include: [{ model: Dealer, as: "dealer" }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    res.json({
      documents: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (err) {
    console.error("Get documents error:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
};

// =====================================================================
// UPLOAD DOCUMENT
// =====================================================================
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { documentType, description, dealerId } = req.body;

    const document = await Document.create({
      documentType,
      documentName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      description,

      dealerId: dealerId || req.user.dealerId, // Use provided dealerId or fallback to user's dealerId
      uploadedBy: req.user.username,

      // Multi-stage workflow defaults
      approvalStage: "dealer_admin",
      approvalStatus: "pending",
    });

    await AuditLog.create({
      userId: req.user.id,
      action: "UPLOAD_DOCUMENT",
      entity: "Document",
      entityId: document.id,
      changes: { documentType, documentName: req.file.originalname },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Notify TMs and AMs
    const io = req.app.get("io");
    if (io) {
      io.to("role:tm").emit("document:new", { dealerId: document.dealerId });
      io.to("role:am").emit("document:new", { dealerId: document.dealerId });
    }

    await Notification.create({
      senderId: req.user.id,
      recipientRole: "tm",
      title: "New Document Uploaded",
      message: `${req.user.username} uploaded "${document.documentName}".`,
      type: "document",
      relatedId: document.id,
    });

    res.status(201).json(document);
  } catch (err) {
    console.error("Upload document error:", err);
    res.status(500).json({ error: "Failed to upload document" });
  }
};

// =====================================================================
// DOWNLOAD DOCUMENT
// =====================================================================
const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const where = { id };
    if (req.scope?.dealers) {
      Object.assign(where, req.scope.dealers);
    } else if (["dealer_admin", "dealer_staff", "dealer"].includes(req.user.role)) {
      where.dealerId = req.user.dealerId;
    }

    const document = await Document.findOne({ where });
    if (!document) return res.status(404).json({ error: "Document not found" });

    if (!fs.existsSync(document.filePath))
      return res.status(404).json({ error: "File missing on server" });

    await AuditLog.create({
      userId: req.user.id,
      action: "DOWNLOAD_DOCUMENT",
      entity: "Document",
      entityId: document.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return res.download(document.filePath, document.documentName);
  } catch (err) {
    console.error("Download document error:", err);
    res.status(500).json({ error: "Failed to download document" });
  }
};

// =====================================================================
// DELETE DOCUMENT
// =====================================================================
const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);
    if (!document) return res.status(404).json({ error: "Document not found" });

    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    await document.destroy();

    await AuditLog.create({
      userId: req.user.id,
      action: "DELETE_DOCUMENT",
      entity: "Document",
      entityId: document.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    console.error("Delete document error:", err);
    res.status(500).json({ error: "Failed to delete document" });
  }
};

// =====================================================================
// APPROVE / REJECT DOCUMENT (Multi-Stage)
// =====================================================================
const approveDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    if (!["approve", "reject"].includes(action))
      return res.status(400).json({ error: "Invalid action" });

    const document = await Document.findByPk(id);
    if (!document) return res.status(404).json({ error: "Document not found" });

    const role = req.user.roleDetails?.name || req.user.role;
    const stage = document.approvalStage || "dealer_admin";

    // Permission check
    if (!isApproverForStage(role, stage)) {
      return res.status(403).json({
        error: `You are not authorized to approve/reject this document at stage: ${stage}`,
      });
    }

    if (action === "reject") {
      document.approvalStatus = "rejected";
      document.status = "rejected";
      document.rejectionReason = reason || "Rejected by approver";
      document.approvalStage = null;
    } else {
      const next = nextStage(stage, "document");

      if (!next) {
        // Final approval
        document.approvalStatus = "approved";
        document.status = "approved";
        document.approvalStage = null;
      } else {
        document.approvalStatus = "pending";
        document.approvalStage = next;
      }
    }

    document.approvedBy = req.user.id;
    document.approvedAt = new Date();

    await document.save();

    await AuditLog.create({
      userId: req.user.id,
      action: action === "approve" ? "APPROVE_DOCUMENT" : "REJECT_DOCUMENT",
      entity: "Document",
      entityId: document.id,
      changes: { action, reason },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Notify dealer
    const io = req.app.get("io");

    await Notification.create({
      senderId: req.user.id,
      recipientId: document.dealerId,
      title: `Document ${document.status}`,
      message:
        document.status === "approved"
          ? `Your document "${document.documentName}" was approved.`
          : `Your document "${document.documentName}" was rejected. Reason: ${document.rejectionReason}`,
      type: "document",
      relatedId: document.id,
    });

    if (io) {
      io.to(`user:${document.dealerId}`).emit("notification", {
        title: `Document ${document.status}`,
        message:
          document.status === "approved"
            ? `✅ "${document.documentName}" approved`
            : `❌ "${document.documentName}" rejected`,
        type: "document",
      });

      io.to("role:tm").emit("document:pending:update");
      io.to("role:am").emit("document:pending:update");
    }

    res.json({
      message: `Document ${document.status}`,
      document,
    });
  } catch (err) {
    console.error("Approve document error:", err);
    res.status(500).json({ error: "Failed to update document status" });
  }
};

// =====================================================================
// MANAGER DOCUMENTS
// =====================================================================
const getManagerDocuments = async (req, res) => {
  try {
    const documents = await Document.findAll({
      include: [
        {
          model: Dealer,
          as: "dealer",
          where: { managerId: req.user.id },
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ documents });
  } catch (err) {
    console.error("getManagerDocuments:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
};

// =====================================================================
// EXPORTS
// =====================================================================
module.exports = {
  upload,
  getAllDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  approveDocument,
  getManagerDocuments,
};
