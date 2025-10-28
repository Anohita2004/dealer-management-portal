const { Dealer, Invoice, CreditDebitNote, AccountStatement, AuditLog } = require('../models');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const getDealerPerformanceReport = async (req, res) => {
  try {
    const { dealerId, startDate, endDate, productGroup } = req.query;

    const where = {};
    if (dealerId) where.dealerId = dealerId;
    if (productGroup) where.productGroup = productGroup;
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

    const totalSales = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);
    const paidAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.paidAmount), 0);
    const pendingAmount = totalSales - paidAmount;

    const report = {
      totalInvoices: invoices.length,
      totalSales,
      paidAmount,
      pendingAmount,
      invoices
    };

    res.json(report);
  } catch (error) {
    console.error('Dealer performance report error:', error);
    res.status(500).json({ error: 'Failed to generate dealer performance report' });
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

module.exports = {
  getDealerPerformanceReport,
  getAccountStatementReport,
  getInvoiceRegisterReport,
  getCreditDebitNoteReport,
  getOutstandingReceivablesReport,
  getTerritoryReport
};
