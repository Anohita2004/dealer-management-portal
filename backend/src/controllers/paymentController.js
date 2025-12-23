// src/controllers/paymentController.js
// ========================================================================
// PAYMENT CONTROLLER – Unified Multi-Stage Approval Workflow
// dealer_staff → dealer_admin → finance_admin → approved
// ========================================================================

const { PaymentRequest, Invoice, Dealer, AuditLog, sequelize } = require("../models");
const { Op } = require("sequelize");
const RBACEngine = require("../services/rbacEngine");
const { WorkflowService } = require("../services/workflow");

// ========================================================================
// CREATE PAYMENT REQUEST (Dealer Staff)
// ========================================================================
// ========================================================================
// CREATE PAYMENT REQUEST (Dealer Staff) – Safe Version
// ========================================================================
const createPaymentRequest = async (req, res) => {
  try {
    // ===== 1. Check user =====
    if (!req.user) {
      console.warn("Unauthorized attempt to create payment request:", req.ip);
      return res.status(401).json({ error: "Unauthorized: user info missing" });
    }

    // ===== 2. Check body =====
    if (!req.body) {
      console.warn("Empty request body from user:", req.user.id);
      return res.status(400).json({ error: "Request body is missing" });
    }

    const { invoiceId, amount, paymentMode, utrNumber, dealerId: bodyDealerId } = req.body;

    // ===== 3. Validate required fields =====
    if (!invoiceId || !amount || !paymentMode) {
      return res.status(400).json({ error: "Missing required fields: invoiceId, amount, paymentMode" });
    }

    // ===== 4. Determine dealer context =====
    const roleName = req.user.roleDetails?.name || req.user.role;
    let dealerId = req.user.dealerId || bodyDealerId;

    // For dealer-facing roles, enforce own dealer unless explicitly allowed
    if (roleName === "dealer_admin" || roleName === "dealer_staff") {
      if (!req.user.dealerId) {
        return res.status(400).json({ error: "Your account is not linked to a dealer" });
      }
      dealerId = req.user.dealerId;
    } else if (roleName === "sales_executive") {
      // Sales Executive must specify a dealer and it must be in their scope
      if (!dealerId) {
        return res.status(400).json({ error: "dealerId is required for sales executives" });
      }
      const allowedDealers = await RBACEngine.getDealersInScope(req.user);
      if (!allowedDealers.includes(dealerId)) {
        return res.status(403).json({ error: "Dealer is out of scope for this user" });
      }
    } else if (!dealerId) {
      // Other roles must still have a dealer context
      return res.status(400).json({ error: "dealerId is required" });
    }

    // ===== 5. Fetch invoice and validate dealer =====
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    if (invoice.dealerId !== dealerId) {
      return res.status(403).json({ error: "Invoice does not belong to the selected dealer" });
    }

    // ===== 6. Validate amount =====
    if (Number(amount) !== Number(invoice.balanceAmount)) {
      return res.status(400).json({ error: "Amount mismatch with invoice balance" });
    }

    // ===== 7. Handle proof file =====
    const proofPath = req.file ? req.file.path : null;

    // ===== 8. Create payment request =====
    const payment = await PaymentRequest.create({
      invoiceId,
      dealerId,
      amount,
      paymentMode,
      utrNumber: utrNumber || null,
      proofFile: proofPath,
      approvalStage: null,
      approvalStatus: "pending",
      status: "dealer_pending",
    });

    // ===== 9. Log audit =====
    await AuditLog.create({
      userId: req.user.id,
      action: "CREATE_PAYMENT_REQUEST",
      entity: "PaymentRequest",
      entityId: payment.id,
      changes: { invoiceId, dealerId, amount, paymentMode, utrNumber, proofFile: proofPath },
      ipAddress: req.ip,
    });

    // Start payment workflow (dealer_admin → managers → finance_admin)
    await WorkflowService.startWorkflow("payment", payment, req.user);

    // ===== 10. Return response =====
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
    const roleName = req.user?.roleDetails?.name || req.user?.role;

    let where = {};

    if (roleName === "dealer_admin" || roleName === "dealer_staff") {
      where.dealerId = req.user.dealerId;
    } else if (roleName === "sales_executive") {
      const dealerIds = await RBACEngine.getDealersInScope(req.user);
      if (!dealerIds.length) {
        return res.json({ payments: [] });
      }
      where.dealerId = { [Op.in]: dealerIds };
    } else {
      // Other roles: use RBAC scoping on PaymentRequest (by dealerId)
      const scopeWhere = await RBACEngine.buildScopeWhereClause(
        req.user,
        "PaymentRequest"
      );
      Object.assign(where, scopeWhere);
    }

    const payments = await PaymentRequest.findAll({
      where,
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
// APPROVE / REJECT PAYMENT (Multi-Stage via WorkflowService)
// ========================================================================
const approvePayment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { action, reason, remarks } = req.body;
    const finalAction = action || "approve";

    if (!["approve", "reject"].includes(finalAction)) {
      await t.rollback();
      return res.status(400).json({ error: "Invalid action" });
    }

    const payment = await PaymentRequest.findByPk(req.params.id, {
      include: ["Invoice", "Dealer"],
      transaction: t,
    });

    if (!payment) {
      await t.rollback();
      return res.status(404).json({ error: "Payment request not found" });
    }

    let result;

    if (finalAction === "reject") {
      result = await WorkflowService.reject("payment", payment, req.user, {
        reason,
        remarks,
        rollback: false,
        transaction: t,
      });
    } else {
      result = await WorkflowService.approve("payment", payment, req.user, {
        remarks: remarks || reason,
        transaction: t,
      });
    }

    // On final approval, mark invoice paid
    if (result.isFinal && payment.Invoice) {
      await payment.Invoice.update(
        { status: "paid", balanceAmount: 0 },
        { transaction: t }
      );
    }

    await AuditLog.create(
      {
        userId: req.user.id,
        action:
          finalAction === "approve"
            ? "PAYMENT_APPROVED"
            : "PAYMENT_REJECTED",
        entity: "PaymentRequest",
        entityId: payment.id,
        changes: { action: finalAction, reason, remarks },
        ipAddress: req.ip,
      },
      { transaction: t }
    );

    await t.commit();

    return res.json({
      message:
        result.message ||
        (finalAction === "approve"
          ? `Payment ${payment.approvalStatus}`
          : "Payment rejected"),
      payment,
      stage: result.currentStage,
      isFinal: result.isFinal,
    });
  } catch (err) {
    await t.rollback();
    console.error("approvePayment:", err);
    // Workflow validation errors should surface as 403
    if (
      err.message &&
      err.message.includes("cannot approve at stage")
    ) {
      return res.status(403).json({
        error: "Access Denied — Workflow Validation Failed",
        message: err.message,
        userRole: req.user.role || req.user.roleDetails?.name,
        paymentId: req.params.id,
      });
    }

    res
      .status(500)
      .json({ error: "Failed to update payment status", details: err.message });
  }
};

// Keep rejectPayment for backward compatibility (delegates to approvePayment)
const rejectPayment = async (req, res) => {
  req.body = req.body || {};
  req.body.action = "reject";
  return approvePayment(req, res);
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
    // Check if dealer_admin has dealerId
    if (!req.user.dealerId) {
      return res.status(400).json({ 
        error: "Your account is not linked to a dealer. Please contact an administrator." 
      });
    }

    const data = await PaymentRequest.findAll({
      where: {
        dealerId: req.user.dealerId,
        approvalStage: "dealer_admin",
        approvalStatus: "pending",
      },
      include: [
        { 
          model: Invoice,
          attributes: ["id", "invoiceNumber", "totalAmount", "balanceAmount", "status"]
        },
        {
          model: Dealer,
          attributes: ["id", "businessName", "dealerCode"]
        }
      ],
      order: [["createdAt", "DESC"]],
    });

    // Debug info if requested
    if (req.query.debug === 'true') {
      // Get all payment requests for this dealer to see what's in the database
      const allPayments = await PaymentRequest.findAll({
        where: { dealerId: req.user.dealerId },
        attributes: ["id", "dealerId", "approvalStage", "approvalStatus", "status", "createdAt"],
        order: [["createdAt", "DESC"]],
        limit: 10
      });

      return res.json({ 
        pending: data,
        debug: {
          dealerAdminDealerId: req.user.dealerId,
          dealerAdminRole: req.user.role || req.user.roleDetails?.name,
          count: data.length,
          query: {
            dealerId: req.user.dealerId,
            approvalStage: "dealer_admin",
            approvalStatus: "pending"
          },
          allPaymentsForDealer: allPayments.map(p => ({
            id: p.id,
            dealerId: p.dealerId,
            approvalStage: p.approvalStage,
            approvalStatus: p.approvalStatus,
            status: p.status,
            createdAt: p.createdAt
          }))
        }
      });
    }

    res.json({ pending: data });
  } catch (err) {
    console.error("getDealerAdminPending:", err);
    res.status(500).json({ error: "Failed to fetch dealer admin pending payments", details: err.message });
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
