// src/services/workflow/WorkflowResolver.js
// Resolves workflow stages, validates users, and determines transitions

const { getPipeline } = require('./pipelines');
const { STAGE_APPROVERS } = require('../../utils/approvalEngine');

/**
 * WorkflowResolver - Handles stage navigation and validation
 */
class WorkflowResolver {
  /**
   * Get pipeline for entity type
   * @param {string} entityType - Type of entity
   * @returns {Array<string>} Pipeline array
   */
  static getPipeline(entityType) {
    return getPipeline(entityType);
  }

  /**
   * Get current stage index
   * @param {Object} entity - Entity object
   * @param {string} entityType - Optional entity type
   * @returns {number} Current stage index (-1 if not in pipeline)
   */
  static getCurrentStageIndex(entity, entityType = null) {
    if (!entity.approvalStage) return -1;
    const type = entityType || this.getEntityType(entity);
    const pipeline = this.getPipeline(type);
    return pipeline.indexOf(entity.approvalStage);
  }

  /**
   * Get current stage
   * @param {Object} entity - Entity object
   * @returns {string|null} Current stage
   */
  static getCurrentStage(entity) {
    return entity.approvalStage || null;
  }

  /**
   * Get next stage
   * @param {Object} entity - Entity object
   * @param {string} entityType - Optional entity type
   * @returns {string|null} Next stage (null if at final stage)
   */
  static getNextStage(entity, entityType = null) {
    const type = entityType || this.getEntityType(entity);
    const pipeline = this.getPipeline(type);
    const currentIndex = this.getCurrentStageIndex(entity, type);

    if (currentIndex === -1) {
      // Not in pipeline, return first stage
      return pipeline.length > 0 ? pipeline[0] : null;
    }

    const nextIndex = currentIndex + 1;
    return nextIndex < pipeline.length ? pipeline[nextIndex] : null;
  }

  /**
   * Get previous stage
   * @param {Object} entity - Entity object
   * @param {string} entityType - Optional entity type
   * @returns {string|null} Previous stage (null if at first stage)
   */
  static getPreviousStage(entity, entityType = null) {
    const type = entityType || this.getEntityType(entity);
    const pipeline = this.getPipeline(type);
    const currentIndex = this.getCurrentStageIndex(entity, type);

    if (currentIndex <= 0) return null;
    return pipeline[currentIndex - 1];
  }

  /**
   * Check if entity is at final stage
   * @param {Object} entity - Entity object
   * @param {string} entityType - Optional entity type
   * @returns {boolean} True if at final stage
   */
  static isFinalStage(entity, entityType = null) {
    const type = entityType || this.getEntityType(entity);
    const pipeline = this.getPipeline(type);
    const currentIndex = this.getCurrentStageIndex(entity, type);

    if (currentIndex === -1) return false;
    return currentIndex === pipeline.length - 1;
  }

  /**
   * Check if entity is at first stage
   * @param {Object} entity - Entity object
   * @returns {boolean} True if at first stage
   */
  static isFirstStage(entity) {
    const currentIndex = this.getCurrentStageIndex(entity);
    return currentIndex === 0;
  }

  /**
   * Validate if user can approve at current stage
   * @param {Object} user - User object
   * @param {Object} entity - Entity object
   * @param {string} entityType - Optional entity type (if not provided, will be inferred)
   * @param {boolean} allowSuperAdmin - Allow super admin override (default: true)
   * @returns {boolean} True if user can approve
   */
  static validateUserCanApprove(user, entity, entityType = null, allowSuperAdmin = true) {
    const roleName = user.roleDetails?.name || user.role;
    const currentStage = this.getCurrentStage(entity);

    if (!currentStage) {
      // Workflow hasn't been started - this should be handled by the controller
      // but we'll return false here to prevent approval
      return false;
    }

    // Super admin can always approve (if allowed)
    if (allowSuperAdmin && roleName === 'super_admin') {
      return true;
    }

    // Get entity type if not provided
    const type = entityType || this.getEntityType(entity);

    // Check if user's role is in the allowed approvers for this stage
    const allowedRoles = STAGE_APPROVERS[type]?.[currentStage] || [];
    if (allowedRoles.length > 0) {
      return allowedRoles.includes(roleName);
    }

    // Fallback: User's role must match the current stage (for backward compatibility)
    return roleName === currentStage;
  }

  /**
   * Get all stages for entity type
   * @param {string} entityType - Type of entity
   * @returns {Array<string>} All stages
   */
  static getAllStages(entityType) {
    return this.getPipeline(entityType);
  }

  /**
   * Get completed stages
   * @param {Object} entity - Entity object
   * @param {string} entityType - Optional entity type
   * @returns {Array<string>} Completed stages
   */
  static getCompletedStages(entity, entityType = null) {
    const type = entityType || this.getEntityType(entity);
    const pipeline = this.getPipeline(type);
    const currentIndex = this.getCurrentStageIndex(entity, type);

    if (currentIndex === -1) return [];
    return pipeline.slice(0, currentIndex);
  }

  /**
   * Get pending stages
   * @param {Object} entity - Entity object
   * @param {string} entityType - Optional entity type
   * @returns {Array<string>} Pending stages
   */
  static getPendingStages(entity, entityType = null) {
    const type = entityType || this.getEntityType(entity);
    const pipeline = this.getPipeline(type);
    const currentIndex = this.getCurrentStageIndex(entity, type);

    if (currentIndex === -1) return pipeline;
    return pipeline.slice(currentIndex + 1);
  }

  /**
   * Get entity type from entity object or use provided type
   * @param {Object} entity - Entity object
   * @param {string} providedType - Optional entity type (if already known)
   * @returns {string} Entity type
   */
  static getEntityType(entity, providedType = null) {
    if (providedType) return providedType;

    // Infer from model name or constructor
    const modelName = entity.constructor?.name || '';
    const typeMap = {
      Order: 'order',
      Invoice: 'invoice',
      PaymentRequest: 'payment',
      PricingUpdate: 'pricing',
      Document: 'document',
      Campaign: 'campaign',
    };

    return typeMap[modelName] || 'order';
  }

  /**
   * Get initial stage for a new entity based on creator
   * @param {string} entityType - Type of entity
   * @param {Object} creatorUser - User who created the entity
   * @returns {string} Initial stage name
   */
  static getInitialStage(entityType, creatorUser) {
    const pipeline = this.getPipeline(entityType);
    if (!pipeline.length) return null;

    // For orders, invoices, payments, and documents, always start at the first stage
    // These entity types require explicit approval at each stage, including the first
    const alwaysStartAtFirst = ['order', 'invoice', 'payment', 'document'];
    if (alwaysStartAtFirst.includes(entityType)) {
      return pipeline[0];
    }

    const roleName = creatorUser?.roleDetails?.name || creatorUser?.role;

    // For other entity types (pricing, campaign, dealer), find the first stage
    // that the creator cannot approve - this allows creators to "skip" stages
    // they are authorized to approve
    for (const stage of pipeline) {
      const allowedRoles = STAGE_APPROVERS[entityType]?.[stage] || [];
      if (!allowedRoles.includes(roleName)) {
        return stage;
      }
    }

    // Fallback: return the first stage
    return pipeline[0];
  }

  /**
   * Check if stage exists in pipeline
   * @param {string} entityType - Type of entity
   * @param {string} stage - Stage name
   * @returns {boolean} True if stage exists
   */
  static isValidStage(entityType, stage) {
    const pipeline = this.getPipeline(entityType);
    return pipeline.includes(stage);
  }
}

module.exports = WorkflowResolver;

