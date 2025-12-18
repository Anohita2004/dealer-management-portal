// src/controllers/paymentController.js
// ========================================================================
// PAYMENT CONTROLLER – Unified Multi-Stage Approval Workflow
// dealer_staff → dealer_admin → finance_admin → approved
// ========================================================================

const { PaymentRequest, Invoice, Dealer, AuditLog, sequelize } = require("../models");
const { Op } = require("sequelize");
const { nextStage, isApproverForStage } = require("../utils/approvalEngine");

// ========================================================================
// CREATE PAYMENT REQUEST (Dealer Staff)
// ========================================================================
// ========================================================================
// CREATE PAYMENT REQUEST (Dealer Staff) – Safe Version
// ========================================================================
const createPaymentRequest = async (req, res) => {
  try {
    // ===== 1. Check user =====
    if (!req.user || !req.user.dealerId) {
      console.warn("Unauthorized attempt to create payment request:", req.ip);
      return res.status(401).json({ error: "Unauthorized: user info missing" });
    }

    // ===== 2. Check body =====
    if (!req.body) {
      console.warn("Empty request body from user:", req.user.id);
      return res.status(400).json({ error: "Request body is missing" });
    }

    const { invoiceId, amount, paymentMode, utrNumber } = req.body;

    // ===== 3. Validate required fields =====
    if (!invoiceId || !amount || !paymentMode) {
      return res.status(400).json({ error: "Missing required fields: invoiceId, amount, paymentMode" });
    }

    // ===== 4. Fetch invoice =====
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // ===== 5. Validate amount =====
    if (Number(amount) !== Number(invoice.balanceAmount)) {
      return res.status(400).json({ error: "Amount mismatch with invoice balance" });
    }

    // ===== 6. Handle proof file =====
    const proofPath = req.file ? req.file.path : null;

    // ===== 7. Create payment request =====
    const payment = await PaymentRequest.create({
      invoiceId,
      dealerId: req.user.dealerId,
      amount,
      paymentMode,
      utrNumber: utrNumber || null,
      proofFile: proofPath,
      approvalStage: "dealer_admin",
      approvalStatus: "pending",
      status: "dealer_admin_pending",
    });

    // ===== 8. Log audit =====
    await AuditLog.create({
      userId: req.user.id,
      action: "CREATE_PAYMENT_REQUEST",
      entity: "PaymentRequest",
      entityId: payment.id,
      changes: { invoiceId, amount, paymentMode, utrNumber, proofFile: proofPath },
      ipAddress: req.ip,
    });

    // ===== 9. Return response =====
    res.status(201).json({ message: "Payment request created", payment });
  } catch (err) {
    console.error("createPaymentRequest error:", err);
    res.status(500).json({ error: "Failed to submit payment request" });
  }
};

// ========================================================================
// GET PAYMENTS (Dealer)
// ========================================================================
const getDealerPayments = async (req, res) => {
  try {
    const payments = await PaymentRequest.findAll({
      where: { dealerId: req.user.dealerId },
      include: ["Invoice"],
      order: [["createdAt", "DESC"]],
    });
    res.json({ payments });
  } catch (err) {
    console.error("getDealerPayments:", err);
    res.status(500).json({ error: "Failed to fetch payment requests" });
  }
};

// ========================================================================
// GET PENDING PAYMENTS (Dealer Admin / Finance Admin)
// ========================================================================
const getPendingPayments = async (req, res) => {
  try {
    const role = req.user.roleDetails?.name || req.user.role;
    const stageField = role === "finance_admin" ? "finance_admin" : "dealer_admin";

    const pending = await PaymentRequest.findAll({
      where: {
        approvalStage: stageField,
        approvalStatus: "pending",
        ...(role !== "finance_admin" && { dealerId: req.user.dealerId }),
      },
      include: ["Invoice", "Dealer"],
      order: [["createdAt", "DESC"]],
    });

    res.json({ pending });
  } catch (err) {
    console.error("getPendingPayments:", err);
    res.status(500).json({ error: "Failed to fetch pending payments" });
  }
};

// ========================================================================
// APPROVE PAYMENT (Multi-Stage)
// ========================================================================
const approvePayment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const payment = await PaymentRequest.findByPk(req.params.id, {
      include: ["Invoice", "Dealer"],
      transaction: t,
    });

    if (!payment) {
      await t.rollback();
      return res.status(404).json({ error: "Payment request not found" });
    }

    const role = req.user.roleDetails?.name || req.user.role;
    const currentStage = payment.approvalStage;

    if (!isApproverForStage(role, currentStage, "payment")) {
      await t.rollback();
      return res.status(403).json({ error: `Not authorized to approve at stage: ${currentStage}` });
    }

    const next = nextStage(currentStage, "payment");

    if (!next) {
      // Final approval
      payment.approvalStage = null;
      payment.approvalStatus = "approved";
      payment.status = "approved";

      // Mark invoice paid
      if (payment.Invoice) {
        await payment.Invoice.update({ status: "paid", balanceAmount: 0 }, { transaction: t });
      }
    } else {
      payment.approvalStage = next;
      payment.approvalStatus = "pending";
      payment.status = `${next}_pending`;
    }

    payment.approvedBy = req.user.username || req.user.id;
    payment.approvedAt = new Date();

    await payment.save({ transaction: t });

    await AuditLog.create(
      {
        userId: req.user.id,
        action: "PAYMENT_APPROVED",
        entity: "PaymentRequest",
        entityId: payment.id,
        changes: { from: currentStage, to: next || "approved" },
        ipAddress: req.ip,
      },
      { transaction: t }
    );

    await t.commit();

    res.json({
      message: next ? `Payment moved to next stage: ${next}` : "Payment fully approved",
      payment,
    });
  } catch (err) {
    await t.rollback();
    console.error("approvePayment:", err);
    res.status(500).json({ error: "Failed to approve payment" });
  }
};

// ========================================================================
// REJECT PAYMENT (Multi-Stage)
// ========================================================================
const rejectPayment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { reason } = req.body;

    const payment = await PaymentRequest.findByPk(req.params.id, {
      include: ["Invoice", "Dealer"],
      transaction: t,
    });

    if (!payment) {
      await t.rollback();
      return res.status(404).json({ error: "Payment request not found" });
    }

    const role = req.user.roleDetails?.name || req.user.role;
    const currentStage = payment.approvalStage;

    if (!isApproverForStage(role, currentStage, "payment")) {
      await t.rollback();
      return res.status(403).json({ error: `Not authorized to reject at stage: ${currentStage}` });
    }

    payment.approvalStage = null;
    payment.approvalStatus = "rejected";
    payment.status = "rejected";
    payment.rejectionReason = reason || "Rejected by approver";
    payment.approvedBy = req.user.username || req.user.id;
    payment.approvedAt = new Date();

    await payment.save({ transaction: t });

    await AuditLog.create(
      {
        userId: req.user.id,
        action: "PAYMENT_REJECTED",
        entity: "PaymentRequest",
        entityId: payment.id,
        changes: { reason },
        ipAddress: req.ip,
      },
      { transaction: t }
    );

    await t.commit();

    res.json({ message: "Payment rejected", payment });
  } catch (err) {
    await t.rollback();
    console.error("rejectPayment:", err);
    res.status(500).json({ error: "Failed to reject payment" });
  }
};

// ========================================================================
// AUTO-RECONCILE PAYMENTS
// ========================================================================
const autoReconcile = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const matches = await PaymentRequest.findAll({
      where: {
        approvalStage: "finance_admin",
        approvalStatus: "pending",
        utrNumber: { [Op.ne]: null },
      },
      include: ["Invoice"],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const autoApproved = [];
    const flagged = [];

    for (const p of matches) {
      if (p.Invoice && Number(p.amount) === Number(p.Invoice.balanceAmount)) {
        await p.update(
          { approvalStage: null, approvalStatus: "approved", status: "approved", approvedBy: "AUTO-RECONCILE", approvedAt: new Date() },
          { transaction: t }
        );

        await p.Invoice.update({ status: "paid", balanceAmount: 0 }, { transaction: t });

        autoApproved.push(p.id);
      } else {
        flagged.push({
          paymentRequestId: p.id,
          invoiceId: p.Invoice?.id,
          paymentAmount: p.amount,
          invoiceBalance: p.Invoice?.balanceAmount,
        });
      }
    }

    await t.commit();

    res.json({ autoApprovedCount: autoApproved.length, flaggedCount: flagged.length, flagged });
  } catch (err) {
    await t.rollback();
    console.error("autoReconcile:", err);
    res.status(500).json({ error: "Auto-reconciliation failed" });
  }
};
// ========================================================================
// DEALER ADMIN → Pending Payment Requests
// ========================================================================
const getDealerAdminPending = async (req, res) => {
  try {
    const data = await PaymentRequest.findAll({
      where: {
        dealerId: req.user.dealerId,
        approvalStage: "dealer_admin",
        approvalStatus: "pending",
      },
      include: ["Invoice"],
      order: [["createdAt", "DESC"]],
    });

    res.json({ pending: data });
  } catch (err) {
    console.error("getDealerAdminPending:", err);
    res.status(500).json({ error: "Failed to fetch dealer admin pending payments" });
  }
};

// ========================================================================
// GET DUE PAYMENTS (Outstanding Invoices)
// ========================================================================
const getDuePayments = async (req, res) => {
  try {
    const user = req.user;
    const where = {};

    // Scope by dealer if user is dealer_admin or dealer_staff
    if (user.dealerId) {
      where.dealerId = user.dealerId;
    }

    // Get invoices with outstanding balance
    where.balanceAmount = { [Op.gt]: 0 };
    where.status = { [Op.in]: ["unpaid", "partial", "overdue"] };

    const invoices = await Invoice.findAll({
      where,
      include: [
        {
          model: Dealer,
          as: "dealer",
          attributes: ["id", "dealerCode", "businessName", "outstandingAmount"],
        },
      ],
      order: [["dueDate", "ASC"]],
    });

    const today = new Date();
    const duePayments = invoices.map((inv) => {
      const dueDate = new Date(inv.dueDate);
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        balanceAmount: inv.balanceAmount,
        status: inv.status,
        daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
        isOverdue: daysOverdue > 0,
        dealer: inv.dealer,
      };
    });

    const totalDue = invoices.reduce((sum, inv) => sum + Number(inv.balanceAmount || 0), 0);
    const overdueCount = invoices.filter((inv) => {
      const dueDate = new Date(inv.dueDate);
      return today > dueDate;
    }).length;

    res.json({
      duePayments,
      totalDue,
      overdueCount,
      totalCount: invoices.length,
    });
  } catch (err) {
    console.error("getDuePayments error:", err);
    res.status(500).json({ error: "Failed to fetch due payments" });
  }
};

// ========================================================================
// EXPORTS
// ========================================================================
module.exports = {
  createPaymentRequest,
  getDealerPayments,
  getPendingPayments,
  approvePayment,
  rejectPayment,
  autoReconcile,
  getDealerAdminPending,
  getDuePayments,
};
