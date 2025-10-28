const { Invoice, Dealer, AuditLog } = require('../models');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const getAllInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, dealerId, status, productGroup, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (dealerId) where.dealerId = dealerId;
    if (status) where.status = status;
    if (productGroup) where.productGroup = productGroup;
    if (startDate && endDate) {
      where.invoiceDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    if (req.user.role === 'dealer') {
      where.dealerId = req.user.dealerId;
    }

    const { count, rows } = await Invoice.findAndCountAll({
      where,
      include: [{ model: Dealer, as: 'dealer' }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['invoiceDate', 'DESC']]
    });

    res.json({
      invoices: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const where = { id };

    if (req.user.role === 'dealer') {
      where.dealerId = req.user.dealerId;
    }

    const invoice = await Invoice.findOne({
      where,
      include: [{ model: Dealer, as: 'dealer' }]
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
};

const createInvoice = async (req, res) => {
  try {
    const invoiceData = {
      ...req.body,
      balanceAmount: req.body.totalAmount - (req.body.paidAmount || 0)
    };

    const invoice = await Invoice.create(invoiceData);

    await AuditLog.create({
      userId: req.user.id,
      action: 'CREATE_INVOICE',
      entity: 'Invoice',
      entityId: invoice.id,
      changes: invoiceData,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
};

const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const oldData = invoice.toJSON();
    const updateData = {
      ...req.body,
      balanceAmount: req.body.totalAmount - (req.body.paidAmount || 0)
    };

    await invoice.update(updateData);

    await AuditLog.create({
      userId: req.user.id,
      action: 'UPDATE_INVOICE',
      entity: 'Invoice',
      entityId: invoice.id,
      changes: { old: oldData, new: updateData },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json(invoice);
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
};

const generateInvoicePDF = async (req, res) => {
  try {
    const { id } = req.params;
    const where = { id };

    if (req.user.role === 'dealer') {
      where.dealerId = req.user.dealerId;
    }

    const invoice = await Invoice.findOne({
      where,
      include: [{ model: Dealer, as: 'dealer' }]
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const doc = new PDFDocument();
    const filename = `invoice-${invoice.invoiceNumber}.pdf`;
    const filepath = path.join(__dirname, '../../uploads', filename);

    doc.pipe(fs.createWriteStream(filepath));

    doc.fontSize(20).text('INVOICE', 50, 50);
    doc.fontSize(12);
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 50, 100);
    doc.text(`Invoice Date: ${invoice.invoiceDate.toDateString()}`, 50, 120);
    doc.text(`Due Date: ${invoice.dueDate ? invoice.dueDate.toDateString() : 'N/A'}`, 50, 140);

    doc.text('Bill To:', 50, 180);
    doc.text(`${invoice.dealer.businessName}`, 50, 200);
    doc.text(`${invoice.dealer.address}`, 50, 220);
    doc.text(`${invoice.dealer.city}, ${invoice.dealer.state} ${invoice.dealer.pincode}`, 50, 240);

    doc.text('Description:', 50, 280);
    doc.text(invoice.description || 'Invoice for products/services', 50, 300);

    doc.text(`Amount: ₹${invoice.amount}`, 50, 340);
    doc.text(`Tax Amount: ₹${invoice.taxAmount}`, 50, 360);
    doc.text(`Total Amount: ₹${invoice.totalAmount}`, 50, 380);
    doc.text(`Paid Amount: ₹${invoice.paidAmount}`, 50, 400);
    doc.text(`Balance Amount: ₹${invoice.balanceAmount}`, 50, 420);
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 50, 440);

    doc.end();

    await invoice.update({ pdfPath: filepath });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    const stream = fs.createReadStream(filepath);
    stream.pipe(res);

    await AuditLog.create({
      userId: req.user.id,
      action: 'DOWNLOAD_INVOICE_PDF',
      entity: 'Invoice',
      entityId: invoice.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

  } catch (error) {
    console.error('Generate invoice PDF error:', error);
    res.status(500).json({ error: 'Failed to generate invoice PDF' });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  generateInvoicePDF
};
