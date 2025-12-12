'use strict';

/**
 * Simple SLA evaluator for pending approvals.
 * Intended to be triggered by a cron or manual endpoint.
 */

const { Op } = require("sequelize");
const { Order, Invoice, PaymentRequest, Document, PricingUpdate, Notification } = require("../models");

// SLA thresholds in hours per entity
const THRESHOLDS = {
  order: 48,
  invoice: 48,
  payment: 36,
  document: 24,
  pricing: 24,
};

const now = () => new Date();
const cutoff = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000);

async function notify(recipientRole, title, message, relatedId, type) {
  // relatedId might be integer (for PricingUpdate) or UUID, convert to string or null
  const relatedIdValue = relatedId ? String(relatedId) : null;
  
  await Notification.create({
    recipientRole,
    title,
    message,
    type: type || "sla",
    relatedId: relatedIdValue && relatedIdValue.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) 
      ? relatedIdValue 
      : null, // Only set if it's a valid UUID, otherwise null
  });
}

async function checkPending(model, wherePending, thresholdHours, recipientRole, entityName, attributes = null) {
  const stale = await model.findAll({
    where: {
      ...wherePending,
      createdAt: { [Op.lt]: cutoff(thresholdHours) },
    },
    attributes: attributes, // Only select specified attributes if provided
    order: [["createdAt", "ASC"]],
  });

  for (const rec of stale) {
    await notify(
      recipientRole,
      `SLA Breach: ${entityName}`,
      `${entityName} ${rec.id} pending over ${thresholdHours}h. Please review.`,
      rec.id,
      entityName
    );
  }

  return stale.length;
}

async function runSlaChecks() {
  const results = {};

  results.orders = await checkPending(
    Order,
    { approvalStatus: "pending" },
    THRESHOLDS.order,
    "regional_manager",
    "order"
  );

  results.invoices = await checkPending(
    Invoice,
    { approvalStatus: "pending" },
    THRESHOLDS.invoice,
    "regional_admin",
    "invoice"
  );

  // Payment requests - specify attributes to avoid selecting workflow columns that might cause issues
  results.payments = await checkPending(
    PaymentRequest,
    { status: "dealer_pending", dealerApprovalStatus: "pending" },
    THRESHOLDS.payment,
    "finance_admin",
    "payment",
    ["id", "invoiceId", "dealerId", "amount", "status", "dealerApprovalStatus", "createdAt"] // Only select needed columns
  );

  results.documents = await checkPending(
    Document,
    { status: "pending" },
    THRESHOLDS.document,
    "area_manager",
    "document"
  );

  // Pricing updates - specify attributes to avoid selecting workflow columns
  results.pricing = await checkPending(
    PricingUpdate,
    { status: "pending" },
    THRESHOLDS.pricing,
    "regional_admin",
    "pricing",
    ["id", "productId", "dealerId", "oldPrice", "newPrice", "status", "createdAt"] // Only select needed columns
  );

  return { results, ranAt: now() };
}

module.exports = {
  runSlaChecks,
  checkSLA: runSlaChecks, // Alias for consistency
};

