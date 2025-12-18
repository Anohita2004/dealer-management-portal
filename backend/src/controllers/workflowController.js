// src/controllers/workflowController.js
// Unified workflow controller for all entity types

const { WorkflowService } = require('../services/workflow');
const { sequelize } = require('../models');

/**
 * Generic approve handler for any entity type
 */
const approveEntity = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { type, id } = req.params;
    const { remarks } = req.body;

    // Get entity model
    const entity = await getEntityByType(type, id, { transaction: t });
    if (!entity) {
      await t.rollback();
      return res.status(404).json({ error: `${type} not found` });
    }

    // Approve using WorkflowService
    const result = await WorkflowService.approve(
      type,
      entity,
      req.user,
      { remarks, transaction: t }
    );

    await t.commit();

    res.json({
      success: true,
      message: result.message,
      [type]: entity,
      stage: result.currentStage,
      isFinal: result.isFinal,
    });
  } catch (err) {
    await t.rollback();
    console.error(`Approve ${req.params.type} error:`, err);
    res.status(err.message.includes('cannot approve') ? 403 : 500).json({
      error: `Failed to approve ${req.params.type}`,
      details: err.message,
    });
  }
};

/**
 * Generic reject handler for any entity type
 */
const rejectEntity = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { type, id } = req.params;
    const { reason, remarks } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Get entity model
    const entity = await getEntityByType(type, id, { transaction: t });
    if (!entity) {
      await t.rollback();
      return res.status(404).json({ error: `${type} not found` });
    }

    // Reject using WorkflowService
    const result = await WorkflowService.reject(
      type,
      entity,
      req.user,
      { reason, remarks, rollback: true, transaction: t }
    );

    await t.commit();

    res.json({
      success: true,
      message: result.message,
      [type]: entity,
      reason: result.reason,
    });
  } catch (err) {
    await t.rollback();
    console.error(`Reject ${req.params.type} error:`, err);
    res.status(err.message.includes('cannot reject') ? 403 : 500).json({
      error: `Failed to reject ${req.params.type}`,
      details: err.message,
    });
  }
};

/**
 * Get workflow status for entity
 */
const getWorkflowStatus = async (req, res) => {
  try {
    const { type, id } = req.params;

    // Get entity model
    const entity = await getEntityByType(type, id);
    if (!entity) {
      return res.status(404).json({ error: `${type} not found` });
    }

    // Get workflow status
    const status = await WorkflowService.getWorkflowStatus(type, entity);

    res.json({
      success: true,
      workflow: status,
    });
  } catch (err) {
    console.error(`Get workflow status error:`, err);
    res.status(500).json({
      error: `Failed to get workflow status`,
      details: err.message,
    });
  }
};

/**
 * Helper to get entity by type
 */
async function getEntityByType(type, id, options = {}) {
  const models = require('../models');
  const modelMap = {
    order: models.Order,
    invoice: models.Invoice,
    payment: models.PaymentRequest,
    pricing: models.PricingUpdate,
    document: models.Document,
    campaign: models.Campaign,
  };

  const Model = modelMap[type];
  if (!Model) {
    throw new Error(`Invalid entity type: ${type}`);
  }

  return await Model.findByPk(id, options);
}

module.exports = {
  approveEntity,
  rejectEntity,
  getWorkflowStatus,
};

