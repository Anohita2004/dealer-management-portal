// src/controllers/paymentController.js
// Payment workflow:
//  - Dealer Staff -> creates request -> status: dealer_pending
//  - Dealer Admin -> reviews -> if approved -> status: finance_pending
//  - Finance Admin -> reviews -> if approved -> status: approved (invoice marked paid)
//  - Auto-reconcile runs against finance_pending requests with UTRs

const { PaymentRequest, Invoice, Dealer, AuditLog, sequelize } = require("../models");
const { Op } = require("sequelize");

/**
 * Dealer Staff creates a payment request.
 * Request moves to "dealer_pending" and waits for Dealer Admin approval.
 */
const createPaymentRequest = async (req, res) => {
  try {
    const { invoiceId, amount, paymentMode, utrNumber } = req.body;

    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    if (Number(amount) !== Number(invoice.balanceAmount)) {
      return res.status(400).json({ error: "Amount mismatch with invoice" });
    }

    const proofPath = req.file ? req.file.path : null;

    const payment = await PaymentRequest.create({
      invoiceId,
      dealerId: req.user.dealerId,
      amount,
      paymentMode,
      utrNumber,
      proofFile: proofPath,

      // workflow fields
      status: "dealer_pending",         // draft -> dealer_pending -> finance_pending -> approved/rejected
      dealerApprovalStatus: "pending",  // dealer side approval state
    });

    // Audit log
    await AuditLog.create({
      userId: req.user.id,
      action: "CREATE_PAYMENT_REQUEST",
      entity: "PaymentRequest",
      entityId: payment.id,
      changes: { invoiceId, amount, paymentMode, utrNumber, proofFile: proofPath },
      ipAddress: req.ip
    });

    res.status(201).json({ message: "Payment request sent to Dealer Admin", payment });
  } catch (err) {
    console.error("createPaymentRequest:", err);
    res.status(500).json({ error: "Failed to submit payment request" });
  }
};

/**
 * Dealer: list their own payment requests
 */
const getDealerPayments = async (req, res) => {
  try {
    const data = await PaymentRequest.findAll({
      where: { dealerId: req.user.dealerId },
      include: ["Invoice"],
      order: [["createdAt", "DESC"]]
    });

    res.json({ payments: data });
  } catch (err) {
    console.error("getDealerPayments:", err);
    res.status(500).json({ error: "Failed to fetch payment requests" });
  }
};

/**
 * Dealer Admin: view pending requests for their dealer (status = dealer_pending)
 */
const getDealerAdminPending = async (req, res) => {
  try {
    const data = await PaymentRequest.findAll({
      where: {
        dealerId: req.user.dealerId,
        status: "dealer_pending"
      },
      include: ["Invoice"],
      order: [["createdAt", "DESC"]]
    });

    res.json({ pending: data });
  } catch (err) {
    console.error("getDealerAdminPending:", err);
    res.status(500).json({ error: "Failed to fetch dealer admin pending" });
  }
};

/**
 * Dealer Admin: approve / reject a payment request.
 * On approve -> moves to finance_pending
 * On reject  -> final status = rejected
 */
const reviewPaymentByDealerAdmin = async (req, res) => {
  try {
    const { action, remarks } = req.body; // action: 'approve' | 'reject'
    const request = await PaymentRequest.findByPk(req.params.id, { include: ["Invoice", "Dealer"] });

    if (!request) return res.status(404).json({ error: "Payment request not found" });

    // Ensure the dealer admin belongs to the same dealer (basic guard)
    if (req.user.dealerId !== request.dealerId) {
      return res.status(403).json({ error: "Unauthorized: not your dealer's request" });
    }

    if (request.status !== "dealer_pending") {
      return res.status(400).json({ error: "Request not pending dealer approval" });
    }

    const approvalStatus = action === "approve" ? "approved" : "rejected";

    await request.update({
      dealerApprovalStatus: approvalStatus,
      dealerApprovalRemarks: remarks || null,
      dealerApprovedAt: new Date(),
      dealerApprovedBy: req.user.username || req.user.id,

      // forward to finance if approved
      status: approvalStatus === "approved" ? "finance_pending" : "rejected"
    });

    await AuditLog.create({
      userId: req.user.id,
      action: approvalStatus === "approved" ? "DEALER_APPROVE_PAYMENT" : "DEALER_REJECT_PAYMENT",
      entity: "PaymentRequest",
      entityId: request.id,
      changes: { dealerApprovalStatus: approvalStatus, dealerApprovalRemarks: remarks },
      ipAddress: req.ip
    });

    res.json({ message: `Payment ${approvalStatus} by Dealer Admin`, request });
  } catch (err) {
    console.error("reviewPaymentByDealerAdmin:", err);
    res.status(500).json({ error: "Dealer admin approval failed" });
  }
};

/**
 * Finance Admin: list requests that have been dealer-approved (status = finance_pending)
 */
const getPendingPayments = async (req, res) => {
  try {
    const data = await PaymentRequest.findAll({
      where: { status: "finance_pending" },
      include: ["Invoice", "Dealer"],
      order: [["createdAt", "DESC"]]
    });

    res.json({ pending: data });
  } catch (err) {
    console.error("getPendingPayments:", err);
    res.status(500).json({ error: "Failed to fetch pending payments" });
  }
};

/**
 * Finance Admin: final approve / reject.
 * If approved -> mark invoice as paid and balanceAmount = 0
 */
const reviewPayment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { action, remarks } = req.body; // action: 'approve' | 'reject'
    const request = await PaymentRequest.findByPk(req.params.id, { include: ["Invoice"], transaction: t });

    if (!request) {
      await t.rollback();
      return res.status(404).json({ error: "Payment request not found" });
    }

    if (request.status !== "finance_pending") {
      await t.rollback();
      return res.status(400).json({ error: "Request not pending finance approval" });
    }

    const status = action === "approve" ? "approved" : "rejected";

    // Update payment request
    await request.update({
      status,
      remarks: remarks || null,
      approvedBy: req.user.username || req.user.id,
      approvedAt: new Date()
    }, { transaction: t });

    // If finance approves, update invoice
    if (status === "approved") {
      const invoice = await Invoice.findByPk(request.invoiceId, { transaction: t });
      if (invoice) {
        await invoice.update({
          status: "paid",
          balanceAmount: 0
        }, { transaction: t });
      }
    }

    await AuditLog.create({
      userId: req.user.id,
      action: status === "approved" ? "FINANCE_APPROVE_PAYMENT" : "FINANCE_REJECT_PAYMENT",
      entity: "PaymentRequest",
      entityId: request.id,
      changes: { status, remarks },
      ipAddress: req.ip
    }, { transaction: t });

    await t.commit();
    res.json({ message: `Payment ${status}`, request });
  } catch (err) {
    await t.rollback();
    console.error("reviewPayment:", err);
    res.status(500).json({ error: "Failed to review payment" });
  }
};

/**
 * Auto-Reconciliation:
 * - Runs over finance_pending requests which have UTRs.
 * - If amount === invoice.balanceAmount, auto-approve.
 * - Otherwise flag for manual review (returned in response).
 */
const autoReconcile = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const matches = await PaymentRequest.findAll({
      where: {
        status: "finance_pending",
        utrNumber: { [Op.ne]: null }
      },
      include: ["Invoice"],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    let autoApproved = [];
    let flagged = [];

    for (let p of matches) {
      const invoice = p.Invoice;
      // strict numeric compare
      if (invoice && Number(p.amount) === Number(invoice.balanceAmount)) {
        await p.update({
          status: "approved",
          approvedAt: new Date(),
          approvedBy: "AUTO-RECONCILE"
        }, { transaction: t });

        await invoice.update({
          status: "paid",
          balanceAmount: 0
        }, { transaction: t });

        await AuditLog.create({
          userId: null,
          action: "AUTO_RECONCILE_APPROVE",
          entity: "PaymentRequest",
          entityId: p.id,
          changes: { approvedBy: "AUTO-RECONCILE" },
          ipAddress: req.ip
        }, { transaction: t });

        autoApproved.push(p.id);
      } else {
        // add a little context to flagged list
        flagged.push({
          paymentRequestId: p.id,
          invoiceId: invoice ? invoice.id : null,
          paymentAmount: p.amount,
          invoiceBalance: invoice ? invoice.balanceAmount : null
        });
      }
    }

    await t.commit();
    res.json({
      autoApprovedCount: autoApproved.length,
      flaggedCount: flagged.length,
      flagged
    });
  } catch (err) {
    await t.rollback();
    console.error("autoReconcile:", err);
    res.status(500).json({ error: "Auto-reconciliation failed" });
  }
};

module.exports = {
  createPaymentRequest,
  getDealerPayments,
  getDealerAdminPending,
  reviewPaymentByDealerAdmin,
  getPendingPayments,
  reviewPayment,
  autoReconcile
};
