const { AccountStatement, Invoice, CreditDebitNote } = require("../models");
const { Op } = require("sequelize");

// 📊 Summary - high level financial overview
const getSummary = async (req, res) => {
  try {
    const totalInvoices = await Invoice.count();
    const totalCredit =
      (await CreditDebitNote.sum("amount", { where: { noteType: "credit" } })) || 0;
    const totalDebit =
      (await CreditDebitNote.sum("amount", { where: { noteType: "debit" } })) || 0;
    const totalOutstanding =
      (await Invoice.sum("balanceAmount", { where: { status: { [Op.ne]: "paid" } } })) || 0;

    res.json({
      totalInvoices,
      totalCredit,
      totalDebit,
      totalOutstanding,
    });
  } catch (err) {
    console.error("Error in getSummary:", err);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
};

//
// 🧾 INVOICES
//
const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      order: [["invoiceDate", "DESC"]],
    });
    res.json({ invoices });
  } catch (err) {
    console.error("Error in getInvoices:", err);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
};

const createInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.create(req.body);
    res.status(201).json({ message: "Invoice created", invoice });
  } catch (err) {
    console.error("Error in createInvoice:", err);
    res.status(500).json({ error: "Failed to create invoice" });
  }
};

const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    await invoice.update(req.body);
    res.json({ message: "Invoice updated", invoice });
  } catch (err) {
    console.error("Error in updateInvoice:", err);
    res.status(500).json({ error: "Failed to update invoice" });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    await Invoice.destroy({ where: { id: req.params.id } });
    res.json({ message: "Invoice deleted" });
  } catch (err) {
    console.error("Error in deleteInvoice:", err);
    res.status(500).json({ error: "Failed to delete invoice" });
  }
};

//
// 💼 CREDIT/DEBIT NOTES
//
const getNotes = async (req, res) => {
  try {
    const notes = await CreditDebitNote.findAll({
      order: [["noteDate", "DESC"]],
    });
    res.json({ notes });
  } catch (err) {
    console.error("Error in getNotes:", err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
};

const createNote = async (req, res) => {
  try {
    const note = await CreditDebitNote.create(req.body);
    res.status(201).json({ message: "Note created", note });
  } catch (err) {
    console.error("Error in createNote:", err);
    res.status(500).json({ error: "Failed to create note" });
  }
};

const updateNote = async (req, res) => {
  try {
    const note = await CreditDebitNote.findByPk(req.params.id);
    if (!note) return res.status(404).json({ error: "Note not found" });
    await note.update(req.body);
    res.json({ message: "Note updated", note });
  } catch (err) {
    console.error("Error in updateNote:", err);
    res.status(500).json({ error: "Failed to update note" });
  }
};

const deleteNote = async (req, res) => {
  try {
    await CreditDebitNote.destroy({ where: { id: req.params.id } });
    res.json({ message: "Note deleted" });
  } catch (err) {
    console.error("Error in deleteNote:", err);
    res.status(500).json({ error: "Failed to delete note" });
  }
};

//
// 📚 ACCOUNT STATEMENTS
//
const getStatements = async (req, res) => {
  try {
    const statements = await AccountStatement.findAll({
      order: [["statementDate", "DESC"]],
    });
    res.json({ statements });
  } catch (err) {
    console.error("Error in getStatements:", err);
    res.status(500).json({ error: "Failed to fetch statements" });
  }
};

const createStatement = async (req, res) => {
  try {
    const stmt = await AccountStatement.create(req.body);
    res.status(201).json({ message: "Statement added", stmt });
  } catch (err) {
    console.error("Error in createStatement:", err);
    res.status(500).json({ error: "Failed to create statement" });
  }
};

const updateStatement = async (req, res) => {
  try {
    const stmt = await AccountStatement.findByPk(req.params.id);
    if (!stmt) return res.status(404).json({ error: "Statement not found" });
    await stmt.update(req.body);
    res.json({ message: "Statement updated", stmt });
  } catch (err) {
    console.error("Error in updateStatement:", err);
    res.status(500).json({ error: "Failed to update statement" });
  }
};

//
// 🔁 RECONCILIATION (unpaid invoices)
//
const getReconciliation = async (req, res) => {
  try {
    const invoices = await Invoice.findAll({
      where: { status: { [Op.ne]: "paid" } },
    });
    res.json({ pending: invoices });
  } catch (err) {
    console.error("Error in getReconciliation:", err);
    res.status(500).json({ error: "Failed to fetch reconciliation" });
  }
};

module.exports = {
  getSummary,
  getInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  getStatements,
  createStatement,
  updateStatement,
  getReconciliation,
};
