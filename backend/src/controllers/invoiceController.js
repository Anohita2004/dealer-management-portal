const { Invoice, Dealer, AuditLog, Order, Notification, sequelize } = require("../models");
const { Op } = require("sequelize");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { nextStage, isApproverForStage } = require("../utils/approvalEngine");
const RBACEngine = require("../services/rbacEngine");
const { WorkflowService } = require("../services/workflow");
const eventBus = require("../services/eventBus");
const notificationService = require("../services/notificationService");

/* ============================================================
   Utility Functions
=========================================================== */

const computeAmounts = (data = {}) => {
  const base = Number(data.baseAmount || data.amount || 0);
  const tax = Number(data.taxAmount || 0);
  const paid = Number(data.paidAmount || 0);

  const total = base + tax;
  const balance = total - paid;

  return {
    baseAmount: base,
    taxAmount: tax,
    totalAmount: total,
    paidAmount: paid,
    balanceAmount: balance < 0 ? 0 : balance
  };
};

const ensureDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

/* ============================================================
   GET ALL INVOICES (with advanced filtering)
=========================================================== */

const getAllInvoices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      dealerId,
      status,
      startDate,
      endDate,
      search,
    } = req.query;

    const offset = (page - 1) * limit;

    const where = {};

    if (dealerId) where.dealerId = dealerId;
    if (status) {
      if (['pending', 'approved', 'rejected'].includes(status)) {
        where.approvalStatus = status;
      } else {
        where.status = status;
      }
    }

    if (startDate && endDate) {
      where.invoiceDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    if (search) {
      where[Op.or] = [
        { invoiceNumber: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    // 🔒 Apply hierarchical + role-based scoping for all roles (including sales_executive)
    const scopeWhere = await RBACEngine.buildScopeWhereClause(
      req.user,
      "Invoice"
    );
    Object.assign(where, scopeWhere);

    const { count, rows } = await Invoice.findAndCountAll({
      where,
      include: [{ model: Dealer, as: "dealer" }],
      limit: parseInt(limit, 10),
      offset,
      order: [["invoiceDate", "DESC"]],
    });

    res.json({
      invoices: rows,
      total: count,
      page: Number(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("Get invoices error:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
};

/* ============================================================
   GET SINGLE INVOICE
=========================================================== */

const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const where = { id };

    // 🔒 Ensure user can only load invoices within their scoped dealers
    const scopeWhere = await RBACEngine.buildScopeWhereClause(
      req.user,
      "Invoice"
    );
    Object.assign(where, scopeWhere);

    const invoice = await Invoice.findOne({
      where,
      include: [{ model: Dealer, as: "dealer" }],
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    res.json(invoice);
  } catch (error) {
    console.error("Get invoice error:", error);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
};

/* ============================================================
   CREATE INVOICE (Dealer Staff & Admin)
=========================================================== */

const createInvoice = async (req, res) => {
  try {
    const role = req.user.roleDetails?.name || req.user.role;
    let data = { ...req.body };

    const { orderId } = data;
    if (!orderId) {
      return res.status(400).json({ error: "orderId is required" });
    }

    const order = await Order.findByPk(orderId, {
      include: [{ model: Dealer, as: "dealer" }],
    });
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Dealer-facing roles must only invoice within their scoped dealers
    if (["dealer_admin", "dealer_staff"].includes(role)) {
      if (!req.user.dealerId || order.dealerId !== req.user.dealerId) {
        return res
          .status(403)
          .json({ error: "Order does not belong to your dealer" });
      }
    } else if (!["super_admin", "technical_admin"].includes(role)) {
      // For managers, ensure order's dealer is in their scope
      const canAccess = await RBACEngine.canAccessResource(req.user, {
        dealerId: order.dealerId,
        regionId: order.dealer?.regionId,
        areaId: order.dealer?.areaId,
        territoryId: order.dealer?.territoryId,
      });
      if (!canAccess) {
        return res
          .status(403)
          .json({ error: "Order is outside your allowed scope" });
      }
    }

    if (order.status !== "Approved") {
      return res
        .status(400)
        .json({ error: "Order must be approved before invoice creation" });
    }

    data.dealerId = order.dealerId;
    data.orderId = order.id;
    data.description = data.description || order.description;
    data.invoiceNumber = data.invoiceNumber || `INV-${Date.now()}`;
    data.invoiceDate = new Date();

    data.baseAmount = data.baseAmount || order.totalAmount;
    data.taxAmount = data.taxAmount || 0;
    data.paidAmount = 0;

    const amounts = computeAmounts(data);
    const invoiceData = { ...data, ...amounts };

    const invoice = await Invoice.create(invoiceData);

    // Start invoice workflow (dealer_admin → managers)
    await WorkflowService.startWorkflow("invoice", invoice, req.user);

    await AuditLog.create({
      userId: req.user.id,
      action: "CREATE_INVOICE",
      entity: "Invoice",
      entityId: invoice.id,
      changes: invoiceData,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Emit event for automation
    await eventBus.emit('invoice:created', {
      invoiceId: invoice.id,
      dealerId: invoice.dealerId,
      invoiceNumber: invoice.invoiceNumber
    });

    // Use notification service
    await notificationService.notifyInvoiceCreated(invoice);

    res.status(201).json(invoice);
  } catch (error) {
    console.error("Create invoice error:", error);
    res.status(500).json({ error: "Failed to create invoice" });
  }
};

/* ============================================================
   UPDATE INVOICE (Admins only)
=========================================================== */

const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findByPk(id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const oldData = invoice.toJSON();

    const amounts = computeAmounts(req.body);

    const updateData = {
      ...req.body,
      ...amounts,
    };

    await invoice.update(updateData);

    await AuditLog.create({
      userId: req.user.id,
      action: "UPDATE_INVOICE",
      entity: "Invoice",
      entityId: invoice.id,
      changes: { old: oldData, new: updateData },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.json(invoice);
  } catch (error) {
    console.error("Update invoice error:", error);
    res.status(500).json({ error: "Failed to update invoice" });
  }
};

/* ============================================================
   APPROVE / REJECT INVOICE (Multi-Stage)
=========================================================== */

const approveInvoice = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { action, reason, notes } = req.body;

    // Default to "approve" if no action provided (since this is the approve route)
    const finalAction = action || "approve";

    if (!["approve", "reject"].includes(finalAction))
      return res.status(400).json({ error: "Invalid action" });

    const invoice = await Invoice.findByPk(id, {
      include: [{ model: Dealer, as: "dealer" }],
      transaction: t
    });
    if (!invoice) {
      await t.rollback();
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Use workflow service
    let result;
    if (finalAction === "reject") {
      result = await WorkflowService.reject(
        "invoice",
        invoice,
        req.user,
        { reason, remarks: notes, rollback: true, transaction: t }
      );
    } else {
      result = await WorkflowService.approve(
        "invoice",
        invoice,
        req.user,
        { remarks: notes || reason, transaction: t }
      );
    }

    await AuditLog.create({
      userId: req.user.id,
      action: finalAction === "approve" ? "APPROVE_INVOICE" : "REJECT_INVOICE",
      entity: "Invoice",
      entityId: invoice.id,
      changes: { action: finalAction, reason },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    await t.commit();

    res.json({
      message: result.message || `Invoice ${invoice.approvalStatus}`,
      invoice: invoice,
      stage: result.currentStage,
      isFinal: result.isFinal
    });
  } catch (err) {
    await t.rollback();
    console.error("Approve invoice error:", err);

    // If it's a workflow validation error, return 403
    if (err.message && err.message.includes('cannot approve at stage')) {
      return res.status(403).json({
        error: "Access Denied — Workflow Validation Failed",
        message: err.message,
        userRole: req.user.role || req.user.roleDetails?.name,
        invoiceId: req.params.id
      });
    }

    res.status(500).json({ error: "Failed to update invoice status", details: err.message });
  }
};

/* ============================================================
   GET PENDING INVOICES FOR APPROVAL
=========================================================== */

const getPendingInvoices = async (req, res) => {
  try {
    const role = req.user.roleDetails?.name || req.user.role;

    // Determine approval stage based on role
    let approvalStage;
    if (role === 'dealer_admin') approvalStage = 'dealer_admin';
    else if (role === 'territory_manager') approvalStage = 'territory_manager';
    else if (role === 'area_manager') approvalStage = 'area_manager';
    else if (role === 'regional_manager') approvalStage = 'regional_manager';
    else if (role === 'regional_admin') approvalStage = 'regional_admin';
    else {
      return res.status(403).json({ error: "Role not authorized for invoice approvals" });
    }

    const baseWhere = {
      approvalStage,
      approvalStatus: "pending"
    };

    // Use RBAC engine for scoping
    let where = baseWhere;
    if (req.scope?.invoice) {
      Object.assign(where, req.scope.invoice);
    } else {
      const scopeWhere = await RBACEngine.buildScopeWhereClause(req.user, 'Invoice');
      Object.assign(where, scopeWhere);
    }

    const invoices = await Invoice.findAll({
      where,
      include: [
        {
          model: Dealer,
          as: "dealer",
          attributes: ["id", "businessName", "dealerCode"]
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ invoices });
  } catch (err) {
    console.error("getPendingInvoices:", err);
    res.status(500).json({ error: "Failed to fetch pending invoices" });
  }
};

/* ============================================================
   GENERATE PDF WITH SAFE PATHS
=========================================================== */

const generateInvoicePDF = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔒 Scope PDF downloads the same way as invoice detail
    const scopeWhere = await RBACEngine.buildScopeWhereClause(
      req.user,
      "Invoice"
    );

    const invoice = await Invoice.findOne({
      where: { id, ...scopeWhere },
      include: [{ model: Dealer, as: "dealer" }],
    });

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const pdfDir = path.join(__dirname, "../../uploads/invoices");
    ensureDirectory(pdfDir);

    const filename = `invoice-${invoice.invoiceNumber}.pdf`;
    const filePath = path.join(pdfDir, filename);

    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(22).text("TAX INVOICE", { underline: true });
    doc.moveDown();

    doc.fontSize(12).text(`Invoice No: ${invoice.invoiceNumber}`);
    doc.text(`Invoice Date: ${invoice.invoiceDate.toDateString()}`);
    doc.text(`Dealer: ${invoice.dealer.businessName}`);
    doc.text(`Address: ${invoice.dealer.address}`);
    doc.text(`City: ${invoice.dealer.city}`);
    doc.moveDown();

    doc.fontSize(14).text("Amount Details", { underline: true });
    doc.fontSize(12);
    doc.text(`Base Amount: ₹${invoice.baseAmount}`);
    doc.text(`Tax Amount: ₹${invoice.taxAmount}`);
    doc.text(`Total Amount: ₹${invoice.totalAmount}`);
    doc.text(`Paid: ₹${invoice.paidAmount}`);
    doc.text(`Balance: ₹${invoice.balanceAmount}`);
    doc.moveDown(2);

    doc.text("Thank you for your business!", { italics: true });
    doc.end();

    await invoice.update({ pdfPath: filePath });

    res.download(filePath);

    await AuditLog.create({
      userId: req.user.id,
      action: "DOWNLOAD_INVOICE_PDF",
      entity: "Invoice",
      entityId: invoice.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({ error: "Failed to generate invoice PDF" });
  }
};

/* ============================================================
   REJECT INVOICE (Separate endpoint)
============================================================ */
const rejectInvoice = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { reason, remarks } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Rejection reason is required" });
    }

    const invoice = await Invoice.findByPk(id, {
      include: [{ model: Dealer, as: "dealer" }],
      transaction: t
    });
    if (!invoice) {
      await t.rollback();
      return res.status(404).json({ error: "Invoice not found" });
    }

    const result = await WorkflowService.reject(
      "invoice",
      invoice,
      req.user,
      { reason, remarks, rollback: true, transaction: t }
    );

    await AuditLog.create({
      userId: req.user.id,
      action: "REJECT_INVOICE",
      entity: "Invoice",
      entityId: invoice.id,
      changes: { reason, remarks },
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    await t.commit();

    res.json({
      message: result.message,
      invoice: invoice,
      reason: result.reason
    });
  } catch (err) {
    await t.rollback();
    console.error("Reject invoice error:", err);
    res.status(err.message.includes('cannot reject') ? 403 : 500).json({
      error: "Failed to reject invoice",
      details: err.message
    });
  }
};

/* ============================================================
   GET WORKFLOW STATUS
============================================================ */
const getWorkflowStatus = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const status = await WorkflowService.getWorkflowStatus("invoice", invoice);
    res.json({ success: true, workflow: status });
  } catch (err) {
    console.error("getWorkflowStatus:", err);
    res.status(500).json({ error: "Failed to get workflow status", details: err.message });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  approveInvoice,
  rejectInvoice,
  getPendingInvoices,
  generateInvoicePDF,
  getWorkflowStatus,
};
