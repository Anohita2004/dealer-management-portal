// src/services/workflow/pipelines.js
// Centralized pipeline definitions for all entity types

/**
 * DEALER_PIPELINE
 * Dealers flow through: territory_manager → area_manager → regional_manager → regional_admin
 */
const DEALER_PIPELINE = [
  'territory_manager',
  'area_manager',
  'regional_manager',
  'regional_admin',
];

/**
 * ORDER_PIPELINE
 * Orders flow through: dealer_admin → territory_manager → area_manager → regional_manager → regional_admin
 */
const ORDER_PIPELINE = [
  'dealer_admin',
  'territory_manager',
  'area_manager',
  'regional_manager',
  'regional_admin',
];

/**
 * INVOICE_PIPELINE
 * Invoices follow the same flow as orders
 */
const INVOICE_PIPELINE = [
  'dealer_admin',
  'territory_manager',
  'area_manager',
  'regional_manager',
  'regional_admin',
];

/**
 * PAYMENT_PIPELINE
 * Payments flow through: dealer_admin → territory_manager → area_manager → regional_manager → regional_admin → finance_admin
 */
const PAYMENT_PIPELINE = [
  'dealer_admin',
  'territory_manager',
  'area_manager',
  'regional_manager',
  'regional_admin',
  'finance_admin',
];

/**
 * PRICING_PIPELINE
 * Pricing requests flow through: territory_manager → area_manager → regional_admin → super_admin
 */
const PRICING_PIPELINE = [
  'territory_manager',
  'area_manager',
  'regional_admin',
  'super_admin',
];

/**
 * DOCUMENT_PIPELINE
 * Documents flow through: dealer_admin → territory_manager → area_manager → regional_manager
 */
const DOCUMENT_PIPELINE = [
  'dealer_admin',
  'territory_manager',
  'area_manager',
  'regional_manager',
];

/**
 * CAMPAIGN_PIPELINE
 * Campaigns follow the same flow as pricing: area_manager → regional_admin → super_admin
 */
const CAMPAIGN_PIPELINE = [
  'area_manager',
  'regional_admin',
  'super_admin',
];

/**
 * Get pipeline for entity type
 * @param {string} entityType - Type of entity
 * @returns {Array<string>} Pipeline array
 */
function getPipeline(entityType) {
  const pipelines = {
    dealer: DEALER_PIPELINE,
    order: ORDER_PIPELINE,
    invoice: INVOICE_PIPELINE,
    payment: PAYMENT_PIPELINE,
    pricing: PRICING_PIPELINE,
    document: DOCUMENT_PIPELINE,
    campaign: CAMPAIGN_PIPELINE,
  };

  return pipelines[entityType] || [];
}

/**
 * Get all pipelines
 * @returns {Object} All pipelines
 */
function getAllPipelines() {
  return {
    dealer: DEALER_PIPELINE,
    order: ORDER_PIPELINE,
    invoice: INVOICE_PIPELINE,
    payment: PAYMENT_PIPELINE,
    pricing: PRICING_PIPELINE,
    document: DOCUMENT_PIPELINE,
    campaign: CAMPAIGN_PIPELINE,
  };
}

module.exports = {
  ORDER_PIPELINE,
  INVOICE_PIPELINE,
  PAYMENT_PIPELINE,
  PRICING_PIPELINE,
  DOCUMENT_PIPELINE,
  CAMPAIGN_PIPELINE,
  DEALER_PIPELINE,
  getPipeline,
  getAllPipelines,
};

