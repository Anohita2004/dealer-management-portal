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
  await Notification.create({
    recipientRole,
    title,
    message,
    type: type || "sla",
    relatedId,
    priority: "urgent",
  });
}

async function checkPending(model, wherePending, thresholdHours, recipientRole, entityName) {
  const stale = await model.findAll({
    where: {
      ...wherePending,
      createdAt: { [Op.lt]: cutoff(thresholdHours) },
    },
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

  results.payments = await checkPending(
    PaymentRequest,
    { approvalStatus: "pending" },
    THRESHOLDS.payment,
    "finance_admin",
    "payment"
  );

  results.documents = await checkPending(
    Document,
    { approvalStatus: "pending" },
    THRESHOLDS.document,
    "area_manager",
    "document"
  );

  results.pricing = await checkPending(
    PricingUpdate,
    { approvalStatus: "pending" },
    THRESHOLDS.pricing,
    "regional_admin",
    "pricing"
  );

  return { results, ranAt: now() };
}

module.exports = {
  runSlaChecks,
};

