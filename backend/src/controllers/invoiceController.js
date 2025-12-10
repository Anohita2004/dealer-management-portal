const { Invoice, Dealer, AuditLog, Order } = require("../models");
const { Op } = require("sequelize");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

/* ============================================================
   Utility Functions
============================================================ */

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
============================================================ */

const getAllInvoices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      dealerId,
      status,
      startDate,
      endDate,
      search
    } = req.query;

    const offset = (page - 1) * limit;

    const where = {};

    if (dealerId) where.dealerId = dealerId;
    if (status) where.status = status;

    if (startDate && endDate) {
      where.invoiceDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    if (search) {
      where[Op.or] = [
        { invoiceNumber: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    if (req.user.role === "dealer") {
      where.dealerId = req.user.dealerId;
    }

    const { count, rows } = await Invoice.findAndCountAll({
      where,
      include: [{ model: Dealer, as: "dealer" }],
      limit: parseInt(limit),
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
============================================================ */

const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const where = { id };

    if (req.user.role === "dealer") {
      where.dealerId = req.user.dealerId;
    }

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
============================================================ */

const createInvoice = async (req, res) => {
  try {
    let data = { ...req.body };

    if (req.user.role === "dealer_staff") {
      const { orderId } = data;

      if (!orderId) {
        return res.status(400).json({ error: "orderId is required" });
      }

      const order = await Order.findByPk(orderId);
      if (!order) return res.status(404).json({ error: "Order not found" });

      if (order.dealerId !== req.user.dealerId) {
        return res.status(403).json({ error: "Order does not belong to your dealer" });
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
    }

    const amounts = computeAmounts(data);
    const invoiceData = { ...data, ...amounts };

    const invoice = await Invoice.create(invoiceData);

    await AuditLog.create({
      userId: req.user.id,
      action: "CREATE_INVOICE",
      entity: "Invoice",
      entityId: invoice.id,
      changes: invoiceData,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error("Create invoice error:", error);
    res.status(500).json({ error: "Failed to create invoice" });
  }
};

/* ============================================================
   UPDATE INVOICE (Admins only)
============================================================ */

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
   GENERATE PDF WITH SAFE PATHS
============================================================ */

const generateInvoicePDF = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findOne({
      where: { id },
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

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  generateInvoicePDF,
};
