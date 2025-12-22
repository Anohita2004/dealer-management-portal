// src/services/workflow/WorkflowService.js
// Complete Workflow Service with full lifecycle management

const { Op } = require('sequelize');
const WorkflowResolver = require('./WorkflowResolver');
const { getPipeline } = require('./pipelines');
const notificationService = require('../notificationService');
const taskService = require('../taskService');
const eventBus = require('../eventBus');

/**
 * WorkflowService - Central workflow engine
 */
class WorkflowService {
  /**
   * Start workflow for an entity
   * @param {string} entityType - Type of entity
   * @param {Object} entity - Entity object
   * @param {Object} creatorUser - User who created the entity
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Workflow start result
   */
  static async startWorkflow(entityType, entity, creatorUser, options = {}) {
    const { transaction } = options;
    const pipeline = getPipeline(entityType);

    if (pipeline.length === 0) {
      throw new Error(`No pipeline defined for entity type: ${entityType}`);
    }

    const firstStage = pipeline[0];

    // Set initial stage
    entity.approvalStage = firstStage;
    entity.approvalStatus = 'pending';
    entity.approvedBy = null;
    entity.approvedAt = null;

    // Calculate SLA expiration
    const slaHours = taskService.getSLAHours(entityType);
    entity.currentSlaExpiresAt = new Date(
      Date.now() + slaHours * 60 * 60 * 1000
    );

    await entity.save({ transaction });

    // Create initial timeline entry
    const { WorkflowTimeline } = require('../../models');
    await WorkflowTimeline.create(
      {
        entityType,
        entityId: entity.id,
        stage: firstStage,
        action: 'submitted',
        actorId: creatorUser?.id || null,
        remarks: `Workflow started at stage: ${firstStage}`,
        slaStart: new Date(),
        slaEnd: entity.currentSlaExpiresAt,
      },
      { transaction }
    );

    // Create initial task for first stage approvers
    await taskService.createWorkflowTask(entityType, entity.id, firstStage);

    // Send notification to first stage approvers
    await notificationService.createWorkflowNotification(
      entity,
      entityType,
      'pending_approval',
      creatorUser,
      { nextStage: firstStage }
    );

    // Emit workflow started event
    await eventBus.emit('workflow:started', {
      entityType,
      entityId: entity.id,
      stage: firstStage,
      creatorId: creatorUser?.id,
    });

    return {
      success: true,
      stage: firstStage,
      pipeline,
      slaExpiresAt: entity.currentSlaExpiresAt,
    };
  }

  /**
   * Approve entity and move to next stage
   * @param {string} entityType - Type of entity
   * @param {Object} entity - Entity object
   * @param {Object} user - User approving
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Approval result
   */
  static async approve(entityType, entity, user, options = {}) {
    const { remarks, transaction } = options;

    // Validate user can approve at current stage
    if (!WorkflowResolver.validateUserCanApprove(user, entity, entityType)) {
      throw new Error(
        `User ${user.roleDetails?.name || user.role} cannot approve at stage ${entity.approvalStage}`
      );
    }

    // Check if already approved/rejected
    if (entity.approvalStatus === 'approved' && !entity.approvalStage) {
      throw new Error('Entity is already fully approved');
    }

    if (entity.approvalStatus === 'rejected') {
      throw new Error('Entity has been rejected and cannot be approved');
    }

    const currentStage = entity.approvalStage;
    const nextStage = WorkflowResolver.getNextStage(entity, entityType);

    // Close SLA for current stage
    const { WorkflowTimeline } = require('../../models');
    const currentTimeline = await WorkflowTimeline.findOne({
      where: {
        entityType,
        entityId: entity.id,
        stage: currentStage,
        action: { [Op.in]: ['submitted', 'approved'] },
      },
      order: [['createdAt', 'DESC']],
      transaction,
    });

    if (currentTimeline) {
      currentTimeline.slaEnd = new Date();
      await currentTimeline.save({ transaction });
    }

    // Create approval timeline entry
    await WorkflowTimeline.create(
      {
        entityType,
        entityId: entity.id,
        stage: currentStage,
        action: 'approved',
        actorId: user.id,
        remarks: remarks || `Approved at stage: ${currentStage}`,
        slaStart: currentTimeline?.slaStart || new Date(),
        slaEnd: new Date(),
      },
      { transaction }
    );

    if (nextStage) {
      // Move to next stage
      entity.approvalStage = nextStage;
      entity.approvalStatus = 'pending';
      entity.approvedBy = user.id;
      entity.approvedAt = new Date();

      // Calculate new SLA expiration
      const slaHours = taskService.getSLAHours(entityType);
      entity.currentSlaExpiresAt = new Date(
        Date.now() + slaHours * 60 * 60 * 1000
      );

      await entity.save({ transaction });
      
      // Reload entity to get updated values
      await entity.reload({ transaction });

      // Create timeline entry for next stage
      await WorkflowTimeline.create(
        {
          entityType,
          entityId: entity.id,
          stage: nextStage,
          action: 'submitted',
          actorId: user.id,
          remarks: `Moved to stage: ${nextStage}`,
          slaStart: new Date(),
          slaEnd: entity.currentSlaExpiresAt,
        },
        { transaction }
      );

      // Create task for next stage
      await taskService.createWorkflowTask(entityType, entity.id, nextStage);

      // Close previous tasks
      await taskService.completeWorkflowTasks(entityType, entity.id);

      // Notify next stage approvers
      await notificationService.createWorkflowNotification(
        entity,
        entityType,
        'pending_approval',
        user,
        { nextStage, remarks }
      );

      // Emit stage transition event
      await eventBus.emit('workflow:stage_transition', {
        entityType,
        entityId: entity.id,
        fromStage: currentStage,
        toStage: nextStage,
        approvedBy: user.id,
      });

      return {
        success: true,
        transitioned: true,
        currentStage: nextStage,
        isFinal: false,
        message: `Approved and moved to stage: ${nextStage}`,
      };
    } else {
      // Final approval - workflow complete
      entity.approvalStage = null;
      entity.approvalStatus = 'approved';
      entity.approvedBy = user.id;
      entity.approvedAt = new Date();
      entity.currentSlaExpiresAt = null;

      // Update entity status based on type
      this._updateEntityStatusOnFinalApproval(entity, entityType);

      await entity.save({ transaction });
      
      // Reload entity to get updated values
      await entity.reload({ transaction });

      // Close all tasks
      await taskService.completeWorkflowTasks(entityType, entity.id);

      // Notify creator/owner
      await notificationService.createWorkflowNotification(
        entity,
        entityType,
        'approved',
        user,
        { remarks }
      );

      // Emit final approval event
      await eventBus.emit('workflow:approved', {
        entityType,
        entityId: entity.id,
        approvedBy: user.id,
      });

      return {
        success: true,
        transitioned: false,
        currentStage: null,
        isFinal: true,
        message: 'Entity fully approved',
      };
    }
  }

  /**
   * Reject entity and stop workflow
   * @param {string} entityType - Type of entity
   * @param {Object} entity - Entity object
   * @param {Object} user - User rejecting
   * @param {Object} options - Rejection options
   * @returns {Promise<Object>} Rejection result
   */
  static async reject(entityType, entity, user, options = {}) {
    const { reason, remarks, rollback = true, transaction } = options;

    // Validate user can reject at current stage
    if (!WorkflowResolver.validateUserCanApprove(user, entity, entityType)) {
      throw new Error(
        `User ${user.roleDetails?.name || user.role} cannot reject at stage ${entity.approvalStage}`
      );
    }

    // Check if already approved/rejected
    if (entity.approvalStatus === 'approved' && !entity.approvalStage) {
      throw new Error('Entity is already fully approved');
    }

    if (entity.approvalStatus === 'rejected') {
      throw new Error('Entity is already rejected');
    }

    const currentStage = entity.approvalStage;

    // Update entity
    entity.approvalStatus = 'rejected';
    entity.approvalStage = null;
    entity.rejectionReason = reason || 'Rejected by approver';
    entity.approvedBy = user.id;
    entity.approvedAt = new Date();
    entity.currentSlaExpiresAt = null;

    // Update entity status based on type
    this._updateEntityStatusOnRejection(entity, entityType);

    await entity.save({ transaction });
    
    // Reload entity to get updated values
    await entity.reload({ transaction });

    // Close SLA for current stage
    const { WorkflowTimeline } = require('../../models');
    const currentTimeline = await WorkflowTimeline.findOne({
      where: {
        entityType,
        entityId: entity.id,
        stage: currentStage,
        action: { [Op.in]: ['submitted', 'approved'] },
      },
      order: [['createdAt', 'DESC']],
      transaction,
    });

    if (currentTimeline) {
      currentTimeline.slaEnd = new Date();
      await currentTimeline.save({ transaction });
    }

    // Create rejection timeline entry
    await WorkflowTimeline.create(
      {
        entityType,
        entityId: entity.id,
        stage: currentStage,
        action: 'rejected',
        actorId: user.id,
        remarks: remarks || `Rejected at stage: ${currentStage}`,
        rejectionReason: entity.rejectionReason,
        slaStart: currentTimeline?.slaStart || new Date(),
        slaEnd: new Date(),
      },
      { transaction }
    );

    // Close all tasks
    await taskService.cancelWorkflowTasks(entityType, entity.id);

    // Handle rollback if needed
    if (rollback) {
      await this._handleRejectionRollback(entity, entityType, transaction);
    }

    // Notify creator/owner
    await notificationService.createWorkflowNotification(
      entity,
      entityType,
      'rejected',
      user,
      { reason: entity.rejectionReason, remarks }
    );

    // Emit rejection event
    await eventBus.emit('workflow:rejected', {
      entityType,
      entityId: entity.id,
      rejectedBy: user.id,
      reason: entity.rejectionReason,
    });

    return {
      success: true,
      rejected: true,
      message: 'Entity rejected',
      reason: entity.rejectionReason,
    };
  }

  /**
   * Get workflow status for entity
   * @param {string} entityType - Type of entity
   * @param {Object} entity - Entity object
   * @returns {Promise<Object>} Workflow status
   */
  static async getWorkflowStatus(entityType, entity) {
    try {
      const pipeline = WorkflowResolver.getAllStages(entityType);
      const currentStage = WorkflowResolver.getCurrentStage(entity);
      const completedStages = WorkflowResolver.getCompletedStages(entity, entityType);
      const pendingStages = WorkflowResolver.getPendingStages(entity, entityType);
      const isFinal = WorkflowResolver.isFinalStage(entity, entityType);

      // Get timeline history (with error handling for missing association)
      const { WorkflowTimeline } = require('../../models');
      let timeline = [];
      try {
        timeline = await WorkflowTimeline.findAll({
          where: {
            entityType,
            entityId: entity.id,
          },
          include: [
            {
              model: require('../../models').User,
              as: 'actor',
              attributes: ['id', 'username', 'email'],
              required: false, // Left join - don't fail if actor doesn't exist
            },
          ],
          order: [['createdAt', 'ASC']],
        });
      } catch (timelineErr) {
        console.warn('Failed to load workflow timeline:', timelineErr.message);
        // Continue without timeline if there's an error
        timeline = [];
      }

      return {
        entityType,
        entityId: entity.id,
        pipeline,
        currentStage,
        completedStages,
        pendingStages,
        isFinal,
        approvalStatus: entity.approvalStatus,
        approvedBy: entity.approvedBy,
        approvedAt: entity.approvedAt,
        rejectionReason: entity.rejectionReason,
        currentSlaExpiresAt: entity.currentSlaExpiresAt,
        timeline: timeline.map((t) => ({
          id: t.id,
          stage: t.stage,
          action: t.action,
          actor: t.actor
            ? {
                id: t.actor.id,
                username: t.actor.username,
                email: t.actor.email,
              }
            : null,
          remarks: t.remarks,
          rejectionReason: t.rejectionReason,
          timestamp: t.createdAt,
          slaStart: t.slaStart,
          slaEnd: t.slaEnd,
        })),
      };
    } catch (err) {
      console.error('getWorkflowStatus error:', err);
      throw err;
    }
  }

  /**
   * Update entity status on final approval
   * @private
   */
  static _updateEntityStatusOnFinalApproval(entity, entityType) {
    switch (entityType) {
      case 'order':
        entity.status = 'Approved';
        break;
      case 'invoice':
        // Invoice status remains as is (paid/unpaid/etc.)
        break;
      case 'payment':
        entity.status = 'approved';
        break;
      case 'pricing':
        entity.status = 'approved';
        break;
      case 'document':
        entity.status = 'approved';
        break;
      case 'campaign':
        entity.isActive = true;
        break;
    }
  }

  /**
   * Update entity status on rejection
   * @private
   */
  static _updateEntityStatusOnRejection(entity, entityType) {
    switch (entityType) {
      case 'order':
        entity.status = 'Rejected';
        break;
      case 'invoice':
        // Invoice status remains as is
        break;
      case 'payment':
        entity.status = 'rejected';
        break;
      case 'pricing':
        entity.status = 'rejected';
        break;
      case 'document':
        entity.status = 'rejected';
        break;
      case 'campaign':
        entity.isActive = false;
        break;
    }
  }

  /**
   * Handle rollback logic when entity is rejected
   * @private
   */
  static async _handleRejectionRollback(entity, entityType, transaction) {
    // For orders, restore stock if it was reserved
    if (entityType === 'order') {
      const { OrderItem, Material } = require('../../models');
      const items = await OrderItem.findAll({
        where: { orderId: entity.id },
        transaction,
      });

      for (const item of items) {
        const material = await Material.findByPk(item.materialId, {
          transaction,
        });
        if (material) {
          material.stock = (material.stock || 0) + item.qty;
          await material.save({ transaction });
        }
      }
    }

    // Add other rollback logic as needed for different entity types
  }
}

module.exports = WorkflowService;

