const { Dealer, Invoice, CreditDebitNote, AccountStatement, AuditLog } = require('../models');
const { Op } = require('sequelize');

const { Campaign, Document, Pricing } = require('../models');
const { Order } = require('../models');

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const getDealerPerformanceReport = async (req, res) => {
  try {
    const { dealerId, startDate, endDate, format } = req.query;
    const where = {};

    if (dealerId) where.dealerId = dealerId;
    if (startDate && endDate) {
      where.invoiceDate = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    }

    // Restrict for dealer users
    if (req.user.role === 'dealer') {
      where.dealerId = req.user.dealerId;
    }

    // 🔹 Fetch all dealers with their invoices
    const dealers = await Dealer.findAll({
      where: dealerId ? { id: dealerId } : {},
      include: [{ model: Invoice, as: 'invoices' }],
    });

    // 🔹 Prepare the report data
    const reportData = dealers.map((dealer) => {
      const invoices = dealer.invoices || [];
      const totalSales = invoices.reduce((sum, inv) => sum + (parseFloat(inv.totalAmount) || 0), 0);
      const deliveredOrders = invoices.filter((i) => i.status === 'Delivered').length;
      const pendingOrders = invoices.filter((i) => i.status === 'Pending').length;

      // Assuming you have targets set per dealer (or default to demo values)
      const monthlyTarget = dealer.monthlyTarget || 200000;
      const quarterlyTarget = monthlyTarget * 3;
      const yearlyTarget = monthlyTarget * 12;

      // Product group-wise sales
      const productGroups = {};
      invoices.forEach((inv) => {
        const group = inv.productGroup || 'Others';
        if (!productGroups[group]) productGroups[group] = 0;
        productGroups[group] += parseFloat(inv.totalAmount);
      });

      return {
        dealerName: dealer.businessName,
        dealerCode: dealer.dealerCode,
        totalSales,
        monthlyTarget,
        quarterlyTarget,
        yearlyTarget,
        deliveredOrders,
        pendingOrders,
        productGroups,
      };
    });

    // 🔹 Export as PDF
    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const filePath = path.join(__dirname, '../../reports/dealer_performance.pdf');
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      doc.fontSize(20).fillColor('#003366').text('Dealer Performance Report', { align: 'center' });
      doc.moveDown(2);

      reportData.forEach((r, i) => {
        doc.fontSize(14).fillColor('#111').text(`${i + 1}. ${r.dealerName} (${r.dealerCode})`);
        doc.fontSize(12).text(`Total Sales: ₹${r.totalSales.toFixed(2)}`);
        doc.text(`Targets - M: ₹${r.monthlyTarget}, Q: ₹${r.quarterlyTarget}, Y: ₹${r.yearlyTarget}`);
        doc.text(`Delivered Orders: ${r.deliveredOrders}`);
        doc.text(`Pending Orders: ${r.pendingOrders}`);
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor('#333').text('Product Group Sales:');
        for (const [group, value] of Object.entries(r.productGroups)) {
          doc.text(` - ${group}: ₹${value.toFixed(2)}`);
        }
        doc.moveDown(1.5);
      });

      doc.end();
      stream.on('finish', () => res.download(filePath));
      return;
    }

    // 🔹 Export as Excel
    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Dealer Performance');

      sheet.columns = [
        { header: 'Dealer Code', key: 'dealerCode', width: 15 },
        { header: 'Dealer Name', key: 'dealerName', width: 30 },
        { header: 'Total Sales', key: 'totalSales', width: 15 },
        { header: 'Monthly Target', key: 'monthlyTarget', width: 18 },
        { header: 'Quarterly Target', key: 'quarterlyTarget', width: 18 },
        { header: 'Yearly Target', key: 'yearlyTarget', width: 18 },
        { header: 'Delivered Orders', key: 'deliveredOrders', width: 18 },
        { header: 'Pending Orders', key: 'pendingOrders', width: 18 },
        { header: 'Product Groups', key: 'productGroups', width: 40 },
      ];

      reportData.forEach((r) =>
        sheet.addRow({
          dealerCode: r.dealerCode,
          dealerName: r.dealerName,
          totalSales: r.totalSales,
          monthlyTarget: r.monthlyTarget,
          quarterlyTarget: r.quarterlyTarget,
          yearlyTarget: r.yearlyTarget,
          deliveredOrders: r.deliveredOrders,
          pendingOrders: r.pendingOrders,
          productGroups: JSON.stringify(r.productGroups),
        })
      );

      const filePath = path.join(__dirname, '../../reports/dealer_performance.xlsx');
      await workbook.xlsx.writeFile(filePath);
      return res.download(filePath);
    }

    // 🔹 Default: JSON (for preview)
    res.json(reportData);
  } catch (error) {
    console.error('Dealer performance report error:', error);
    res.status(500).json({ error: 'Failed to generate dealer performance report' });
  }
};
 // add at the top if not already imported

const getAdminSummary = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Parallel queries for efficiency
    const [
      activeCampaigns,
      totalDealers,
      blockedDealers,
      pendingDocuments,
      pendingPricing,
      totalInvoices,
      totalOutstanding
    ] = await Promise.all([
      Campaign.count({ where: { isActive: true } }),
      Dealer.count(),
      Dealer.count({ where: { isBlocked: true } }),
      Document.count({ where: { status: "Pending" } }),
      Pricing.count({ where: { approvedBy: null } }),
      Invoice.count(),
      Invoice.sum('balanceAmount')
    ]);

    res.json({
      activeCampaigns,
      totalDealers,
      blockedDealers,
      pendingDocuments,
      pendingPricing,
      totalInvoices,
      totalOutstanding
    });
  } catch (error) {
    console.error("Admin summary error:", error);
    res.status(500).json({ error: "Failed to fetch admin summary" });
  }
};




const getAccountStatementReport = async (req, res) => {
  try {
    const { dealerId, startDate, endDate, productGroup } = req.query;

    const where = {};
    if (dealerId) where.dealerId = dealerId;
    if (productGroup) where.productGroup = productGroup;
    if (startDate && endDate) {
      where.statementDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    if (req.user.role === 'dealer') {
      where.dealerId = req.user.dealerId;
    }

    const statements = await AccountStatement.findAll({
      where,
      include: [{ model: Dealer, as: 'dealer' }],
      order: [['statementDate', 'ASC']]
    });

    const openingBalance = statements.length > 0 ? parseFloat(statements[0].balance) : 0;
    const closingBalance = statements.length > 0 ? parseFloat(statements[statements.length - 1].balance) : 0;
    const totalDebit = statements.reduce((sum, stmt) => sum + parseFloat(stmt.debitAmount), 0);
    const totalCredit = statements.reduce((sum, stmt) => sum + parseFloat(stmt.creditAmount), 0);

    const report = {
      openingBalance,
      closingBalance,
      totalDebit,
      totalCredit,
      statements
    };

    res.json(report);
  } catch (error) {
    console.error('Account statement report error:', error);
    res.status(500).json({ error: 'Failed to generate account statement report' });
  }
};

const getInvoiceRegisterReport = async (req, res) => {
  try {
    const { dealerId, productGroup, invoiceNumber, startDate, endDate, status } = req.query;

    const where = {};
    if (dealerId) where.dealerId = dealerId;
    if (productGroup) where.productGroup = productGroup;
    if (invoiceNumber) where.invoiceNumber = { [Op.like]: `%${invoiceNumber}%` };
    if (status) where.status = status;
    if (startDate && endDate) {
      where.invoiceDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    if (req.user.role === 'dealer') {
      where.dealerId = req.user.dealerId;
    }

    const invoices = await Invoice.findAll({
      where,
      include: [{ model: Dealer, as: 'dealer' }],
      order: [['invoiceDate', 'DESC']]
    });

    res.json({ invoices });
  } catch (error) {
    console.error('Invoice register report error:', error);
    res.status(500).json({ error: 'Failed to generate invoice register report' });
  }
};

const getCreditDebitNoteReport = async (req, res) => {
  try {
    const { dealerId, startDate, endDate, reasonCode } = req.query;

    const where = {};
    if (dealerId) where.dealerId = dealerId;
    if (reasonCode) where.reasonCode = reasonCode;
    if (startDate && endDate) {
      where.noteDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    if (req.user.role === 'dealer') {
      where.dealerId = req.user.dealerId;
    }

    const notes = await CreditDebitNote.findAll({
      where,
      include: [{ model: Dealer, as: 'dealer' }],
      order: [['noteDate', 'DESC']]
    });

    const totalCredit = notes.filter(n => n.noteType === 'credit').reduce((sum, n) => sum + parseFloat(n.amount), 0);
    const totalDebit = notes.filter(n => n.noteType === 'debit').reduce((sum, n) => sum + parseFloat(n.amount), 0);

    res.json({
      notes,
      totalCredit,
      totalDebit
    });
  } catch (error) {
    console.error('Credit/Debit note report error:', error);
    res.status(500).json({ error: 'Failed to generate credit/debit note report' });
  }
};

const getOutstandingReceivablesReport = async (req, res) => {
  try {
    const where = { status: { [Op.ne]: 'paid' } };

    if (req.user.role === 'dealer') {
      where.dealerId = req.user.dealerId;
    }

    const invoices = await Invoice.findAll({
      where,
      include: [{ model: Dealer, as: 'dealer' }],
      order: [['dueDate', 'ASC']]
    });

    const aging = {
      '0-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0
    };

    const today = new Date();
    invoices.forEach(inv => {
      const dueDate = new Date(inv.dueDate);
      const daysDiff = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      const balance = parseFloat(inv.balanceAmount);

      if (daysDiff <= 30) aging['0-30'] += balance;
      else if (daysDiff <= 60) aging['31-60'] += balance;
      else if (daysDiff <= 90) aging['61-90'] += balance;
      else aging['90+'] += balance;
    });

    res.json({
      invoices,
      aging,
      totalOutstanding: invoices.reduce((sum, inv) => sum + parseFloat(inv.balanceAmount), 0)
    });
  } catch (error) {
    console.error('Outstanding receivables report error:', error);
    res.status(500).json({ error: 'Failed to generate outstanding receivables report' });
  }
};

const getTerritoryReport = async (req, res) => {
  try {
    const { state, territory, region } = req.query;

    const where = {};
    if (state) where.state = state;
    if (territory) where.territory = territory;
    if (region) where.region = region;

    const dealers = await Dealer.findAll({
      where,
      include: [
        { model: Invoice, as: 'invoices' }
      ]
    });

    const report = dealers.map(dealer => {
      const totalSales = dealer.invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);
      const outstanding = parseFloat(dealer.outstandingAmount);
      
      return {
        dealerCode: dealer.dealerCode,
        businessName: dealer.businessName,
        state: dealer.state,
        territory: dealer.territory,
        region: dealer.region,
        totalSales,
        outstanding
      };
    });

    res.json({ report });
  } catch (error) {
    console.error('Territory report error:', error);
    res.status(500).json({ error: 'Failed to generate territory report' });
  }
};
const getPendingApprovals = async (req, res, next) => {
  try {
    const pendingDocs = await Document.findAll({
      where: { status: "pending" },
      include: [
        {
          model: Dealer,
          as: "dealer", // ✅ alias must match your model association
          attributes: ["id", "businessName"],
        },
      ],
    });

    const formatted = pendingDocs.map((doc) => ({
      id: doc.id,
      dealerId: doc.dealer?.id,
      dealerName: doc.dealer?.businessName || "Unknown Dealer",
      documentType: doc.documentType,
      createdAt: doc.createdAt,
      status: doc.status,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    console.error("Error fetching pending approvals:", err);
    next(err);
  }
};



module.exports = {
  getDealerPerformanceReport,
  getAccountStatementReport,
  getInvoiceRegisterReport,
  getCreditDebitNoteReport,
  getOutstandingReceivablesReport,
  getTerritoryReport,
  getAdminSummary ,
  getPendingApprovals// 👈 add this
};
