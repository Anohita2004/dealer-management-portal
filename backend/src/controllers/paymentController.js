// ========================================================================
// PAYMENT CONTROLLER – Multi-Stage Approval Workflow
// dealer_staff → dealer_admin → finance_admin → approved
// ========================================================================

const { PaymentRequest, Invoice, Dealer, AuditLog, sequelize } = require("../models");
const { Op } = require("sequelize");
const { nextStage, isApproverForStage } = require("../utils/approvalEngine");

// ========================================================================
// CREATE PAYMENT REQUEST (Dealer Staff)
// ========================================================================
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

      // Multi-stage workflow defaults
      approvalStatus: "pending",
      approvalStage: "dealer_admin",
      status: "dealer_admin_pending",
    });

    await AuditLog.create({
      userId: req.user.id,
      action: "CREATE_PAYMENT_REQUEST",
      entity: "PaymentRequest",
      entityId: payment.id,
      changes: { invoiceId, amount, paymentMode, utrNumber, proofFile: proofPath },
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: "Payment request created",
      payment,
    });
  } catch (err) {
    console.error("createPaymentRequest:", err);
    res.status(500).json({ error: "Failed to submit payment request" });
  }
};

// ========================================================================
// DEALER → MY PAYMENTS
// ========================================================================
const getDealerPayments = async (req, res) => {
  try {
    const data = await PaymentRequest.findAll({
      where: { dealerId: req.user.dealerId },
      include: ["Invoice"],
      order: [["createdAt", "DESC"]],
    });

    res.json({ payments: data });
  } catch (err) {
    console.error("getDealerPayments:", err);
    res.status(500).json({ error: "Failed to fetch payment requests" });
  }
};

// ========================================================================
// DEALER ADMIN → Pending Requests
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
    res.status(500).json({ error: "Failed to fetch dealer admin pending" });
  }
};

// ========================================================================
// APPROVE PAYMENT (Multi-Stage)
// ========================================================================
const approvePayment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const request = await PaymentRequest.findByPk(req.params.id, {
      include: ["Invoice", "Dealer"],
      transaction: t,
    });

    if (!request) {
      await t.rollback();
      return res.status(404).json({ error: "Payment request not found" });
    }

    const role = req.user.roleDetails?.name || req.user.role;
    const currentStage = request.approvalStage || "dealer_admin";

    // Role validation
    if (!isApproverForStage(role, currentStage)) {
      await t.rollback();
      return res.status(403).json({
        error: `Not authorized to approve at stage: ${currentStage}`,
      });
    }

    const next = nextStage(currentStage, "payment");

    // Final approval
    if (!next) {
      request.approvalStage = null;
      request.approvalStatus = "approved";
      request.status = "approved";

      // Mark invoice paid
      const invoice = await Invoice.findByPk(request.invoiceId, { transaction: t });
      if (invoice) {
        await invoice.update(
          {
            status: "paid",
            balanceAmount: 0,
          },
          { transaction: t }
        );
      }
    } else {
      // Move to next stage
      request.approvalStage = next;
      request.approvalStatus = "pending";
      request.status = `${next}_pending`;
    }

    request.approvedBy = req.user.username || req.user.id;
    request.approvedAt = new Date();

    await request.save({ transaction: t });

    await AuditLog.create(
      {
        userId: req.user.id,
        action: "PAYMENT_APPROVED",
        entity: "PaymentRequest",
        entityId: request.id,
        changes: { from: currentStage, to: next || "approved" },
        ipAddress: req.ip,
      },
      { transaction: t }
    );

    await t.commit();

    res.json({
      message: next ? `Payment moved to next stage: ${next}` : "Payment fully approved",
      request,
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

    const request = await PaymentRequest.findByPk(req.params.id, {
      include: ["Invoice", "Dealer"],
      transaction: t,
    });

    if (!request) {
      await t.rollback();
      return res.status(404).json({ error: "Payment request not found" });
    }

    const role = req.user.roleDetails?.name || req.user.role;
    const currentStage = request.approvalStage || "dealer_admin";

    // Role validation
    if (!isApproverForStage(role, currentStage)) {
      await t.rollback();
      return res.status(403).json({
        error: `Not authorized to reject at stage: ${currentStage}`,
      });
    }

    request.approvalStatus = "rejected";
    request.status = "rejected";
    request.rejectionReason = reason || "Rejected by approver";
    request.approvalStage = null;
    request.approvedBy = req.user.username || req.user.id;
    request.approvedAt = new Date();

    await request.save({ transaction: t });

    await AuditLog.create(
      {
        userId: req.user.id,
        action: "PAYMENT_REJECTED",
        entity: "PaymentRequest",
        entityId: request.id,
        changes: { reason },
        ipAddress: req.ip,
      },
      { transaction: t }
    );

    await t.commit();

    res.json({ message: "Payment rejected", request });
  } catch (err) {
    await t.rollback();
    console.error("rejectPayment:", err);
    res.status(500).json({ error: "Failed to reject payment" });
  }
};

// ========================================================================
// FINANCE ADMIN → Pending Stage
// ========================================================================
const getPendingPayments = async (req, res) => {
  try {
    const data = await PaymentRequest.findAll({
      where: {
        approvalStage: "finance_admin",
        approvalStatus: "pending",
      },
      include: ["Invoice", "Dealer"],
      order: [["createdAt", "DESC"]],
    });

    res.json({ pending: data });
  } catch (err) {
    console.error("getPendingPayments:", err);
    res.status(500).json({ error: "Failed to fetch pending payments" });
  }
};

// ========================================================================
// AUTO-RECONCILE
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

    for (let p of matches) {
      const invoice = p.Invoice;

      if (invoice && Number(p.amount) === Number(invoice.balanceAmount)) {
        await p.update(
          {
            status: "approved",
            approvalStatus: "approved",
            approvalStage: null,
            approvedBy: "AUTO-RECONCILE",
            approvedAt: new Date(),
          },
          { transaction: t }
        );

        await invoice.update(
          { status: "paid", balanceAmount: 0 },
          { transaction: t }
        );

        autoApproved.push(p.id);
      } else {
        flagged.push({
          paymentRequestId: p.id,
          invoiceId: invoice?.id,
          paymentAmount: p.amount,
          invoiceBalance: invoice?.balanceAmount,
        });
      }
    }

    await t.commit();

    res.json({
      autoApprovedCount: autoApproved.length,
      flaggedCount: flagged.length,
      flagged,
    });
  } catch (err) {
    await t.rollback();
    console.error("autoReconcile:", err);
    res.status(500).json({ error: "Auto-reconciliation failed" });
  }
};

// ========================================================================
// EXPORTS
// ========================================================================
module.exports = {
  createPaymentRequest,
  getDealerPayments,
  getDealerAdminPending,
  getPendingPayments,
  approvePayment,
  rejectPayment,
  autoReconcile,
};



