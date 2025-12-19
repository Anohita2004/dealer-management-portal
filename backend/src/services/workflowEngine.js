// src/services/workflowEngine.js
// Multi-stage Workflow Engine with Automation, Validation, and SLA Tracking

const { Op } = require('sequelize');
const { nextStage, isApproverForStage, FLOWS, STAGE_APPROVERS } = require('../utils/approvalEngine');
const notificationService = require('./notificationService');
const eventBus = require('./eventBus');

/**
 * Workflow Engine - Handles multi-stage approval workflows
 */
class WorkflowEngine {
  /**
   * Transition entity to next stage
   * @param {Object} entity - Entity (Order, Invoice, etc.)
   * @param {string} entityType - Type of entity ('order', 'invoice', 'payment', etc.)
   * @param {Object} user - User performing the action
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Updated entity and transition info
   */
  static async transitionToNextStage(entity, entityType, user, options = {}) {
    const { reason, notes } = options;
    const currentStage = entity.approvalStage;
    const roleName = user.roleDetails?.name || user.role;

    // Validate user can approve at current stage
    if (!isApproverForStage(roleName, currentStage, entityType)) {
      throw new Error(`User ${roleName} cannot approve at stage ${currentStage}`);
    }

    const next = nextStage(currentStage, entityType);
    const transaction = options.transaction;

    if (!next) {
      // Final approval
      entity.approvalStage = null;
      entity.approvalStatus = 'approved';
      entity.approvedBy = user.id;
      entity.approvedAt = new Date();

      // Update status field based on entity type
      if (entityType === 'order') {
        entity.status = 'Approved';
      } else if (entityType === 'invoice') {
        entity.status = 'Approved';
      } else if (entityType === 'payment') {
        entity.status = 'Approved';
      }

      await entity.save({ transaction });

      // Emit final approval event
      await eventBus.emit('workflow:approved', {
        entityType,
        entityId: entity.id,
        approvedBy: user.id,
        entity
      });

      // Create notification
      await notificationService.createWorkflowNotification(
        entity,
        entityType,
        'approved',
        user,
        { reason, notes }
      );

      return {
        entity,
        transitioned: true,
        stage: null,
        isFinal: true,
        message: 'Entity fully approved'
      };
    } else {
      // Move to next stage
      entity.approvalStage = next;
      entity.approvalStatus = 'pending';
      entity.approvedBy = user.id;
      entity.approvedAt = new Date();

      await entity.save({ transaction });

      // Emit stage transition event
      await eventBus.emit('workflow:stage_transition', {
        entityType,
        entityId: entity.id,
        fromStage: currentStage,
        toStage: next,
        approvedBy: user.id,
        entity
      });

      // Create notification for next stage approvers
      await notificationService.createWorkflowNotification(
        entity,
        entityType,
        'pending_approval',
        user,
        { nextStage: next, reason, notes }
      );

      return {
        entity,
        transitioned: true,
        stage: next,
        isFinal: false,
        message: `Moved to next stage: ${next}`
      };
    }
  }

  /**
   * Reject entity and handle rollback
   * @param {Object} entity - Entity to reject
   * @param {string} entityType - Type of entity
   * @param {Object} user - User rejecting
   * @param {Object} options - Rejection options
   * @returns {Promise<Object>} Updated entity
   */
  static async rejectEntity(entity, entityType, user, options = {}) {
    const { reason, rollback = true } = options;
    const currentStage = entity.approvalStage;
    const roleName = user.roleDetails?.name || user.role;

    // Validate user can reject at current stage
    if (!isApproverForStage(roleName, currentStage, entityType)) {
      throw new Error(`User ${roleName} cannot reject at stage ${currentStage}`);
    }

    const transaction = options.transaction;

    // Update entity
    entity.approvalStatus = 'rejected';
    entity.approvalStage = null;
    entity.rejectionReason = reason || 'Rejected by approver';
    entity.approvedBy = user.id;
    entity.approvedAt = new Date();

    // Update status field
    if (entityType === 'order') {
      entity.status = 'Rejected';
    } else if (entityType === 'invoice') {
      entity.status = 'Rejected';
    } else if (entityType === 'payment') {
      entity.status = 'Rejected';
    }

    await entity.save({ transaction });

    // Handle rollback if needed
    if (rollback) {
      await this.handleRejectionRollback(entity, entityType, transaction);
    }

    // Emit rejection event
    await eventBus.emit('workflow:rejected', {
      entityType,
      entityId: entity.id,
      rejectedBy: user.id,
      reason: entity.rejectionReason,
      entity
    });

    // Create notification
    await notificationService.createWorkflowNotification(
      entity,
      entityType,
      'rejected',
      user,
      { reason: entity.rejectionReason }
    );

    return {
      entity,
      rejected: true,
      message: 'Entity rejected'
    };
  }

  /**
   * Handle rollback logic when entity is rejected
   * @param {Object} entity - Rejected entity
   * @param {string} entityType - Type of entity
   * @param {Object} transaction - Sequelize transaction
   */
  static async handleRejectionRollback(entity, entityType, transaction) {
    // For orders, restore stock if it was reserved
    if (entityType === 'order' && entity.status === 'Approved') {
      const { OrderItem, Material } = require('../models');
      const items = await OrderItem.findAll({
        where: { orderId: entity.id },
        transaction
      });

      for (const item of items) {
        const material = await Material.findByPk(item.materialId, { transaction });
        if (material) {
          material.stock = (material.stock || 0) + item.qty;
          await material.save({ transaction });
        }
      }
    }

    // For invoices, handle credit/debit notes if needed
    if (entityType === 'invoice') {
      // Add invoice-specific rollback logic here
    }
  }

  /**
   * Get current stage approvers
   * @param {string} entityType - Type of entity
   * @param {string} currentStage - Current approval stage
   * @param {Object} entity - Entity object (for hierarchy-based approver lookup)
   * @returns {Promise<Array>} Array of user IDs who can approve
   */
  static async getCurrentStageApprovers(entityType, currentStage, entity = null) {
    if (!currentStage) return [];

    const allowedRoles = STAGE_APPROVERS[entityType]?.[currentStage] || [];
    if (allowedRoles.length === 0) return [];

    const { User, Role } = require('../models');

    // Get all users with allowed roles
    const roles = await Role.findAll({
      where: { name: { [Op.in]: allowedRoles } },
      include: [{
        model: User,
        as: 'users',
        where: { isActive: true },
        attributes: ['id']
      }]
    });

    let approverIds = [];
    roles.forEach(role => {
      if (role.users) {
        approverIds = approverIds.concat(role.users.map(u => u.id));
      }
    });

    // If entity has hierarchy info, filter approvers by scope
    if (entity && entity.dealerId) {
      const { Dealer } = require('../models');
      const dealer = await Dealer.findByPk(entity.dealerId, {
        include: [
          { model: require('../models').Territory, as: 'territoryRelation' },
          { model: require('../models').Area, as: 'area' },
          { model: require('../models').Region, as: 'region' }
        ]
      });

      if (dealer) {
        // Filter approvers based on dealer's hierarchy
        const scopedApprovers = await User.findAll({
          where: {
            id: { [Op.in]: approverIds },
            isActive: true
          },
          include: [{
            model: Role,
            as: 'roleDetails'
          }]
        });

        // Filter by hierarchy match
        approverIds = scopedApprovers
          .filter(user => {
            const roleName = user.roleDetails?.name;
            if (roleName === 'super_admin' || roleName === 'technical_admin') return true;
            if (roleName === 'regional_manager' || roleName === 'regional_admin') {
              return user.regionId === dealer.regionId;
            }
            if (roleName === 'area_manager') {
              return user.areaId === dealer.areaId;
            }
            if (roleName === 'territory_manager') {
              return user.territoryId === dealer.territoryId;
            }
            return false;
          })
          .map(u => u.id);
      }
    }

    return approverIds;
  }

  /**
   * Check if entity is overdue based on SLA
   * @param {Object} entity - Entity to check
   * @param {string} entityType - Type of entity
   * @param {number} thresholdHours - Hours threshold for SLA
   * @returns {boolean}
   */
  static isOverdue(entity, entityType, thresholdHours = 24) {
    if (!entity.approvalStage || entity.approvalStatus !== 'pending') {
      return false;
    }

    const stageStartTime = entity.approvedAt || entity.createdAt;
    if (!stageStartTime) return false;

    const now = new Date();
    const hoursElapsed = (now - new Date(stageStartTime)) / (1000 * 60 * 60);

    return hoursElapsed > thresholdHours;
  }

  /**
   * Get workflow timeline for entity
   * @param {Object} entity - Entity
   * @param {string} entityType - Type of entity
   * @returns {Promise<Array>} Timeline events
   */
  static async getWorkflowTimeline(entity, entityType) {
    const { AuditLog } = require('../models');
    
    const timeline = [];

    // Add creation event
    timeline.push({
      stage: 'created',
      timestamp: entity.createdAt,
      status: 'created',
      actor: null
    });

    // Add approval/rejection events from audit log
    const auditLogs = await AuditLog.findAll({
      where: {
        entity: entityType.charAt(0).toUpperCase() + entityType.slice(1),
        entityId: entity.id,
        action: { [Op.in]: ['APPROVED', 'REJECTED', 'STAGE_TRANSITION'] }
      },
      order: [['createdAt', 'ASC']]
    });

    auditLogs.forEach(log => {
      timeline.push({
        stage: log.data?.stage || entity.approvalStage,
        timestamp: log.createdAt,
        status: log.action.toLowerCase(),
        actor: log.userId,
        reason: log.data?.reason
      });
    });

    // Add current stage if pending
    if (entity.approvalStage && entity.approvalStatus === 'pending') {
      timeline.push({
        stage: entity.approvalStage,
        timestamp: entity.approvedAt || entity.createdAt,
        status: 'pending',
        actor: entity.approvedBy
      });
    }

    return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Auto-escalate overdue entities
   * @param {string} entityType - Type of entity
   * @param {number} thresholdHours - Hours threshold
   * @returns {Promise<number>} Number of escalated entities
   */
  static async autoEscalateOverdue(entityType, thresholdHours = 24) {
    const models = require('../models');
    const Model = models[entityType.charAt(0).toUpperCase() + entityType.slice(1)];
    
    if (!Model) return 0;

    const overdueEntities = await Model.findAll({
      where: {
        approvalStatus: 'pending',
        approvalStage: { [Op.ne]: null }
      }
    });

    let escalated = 0;

    for (const entity of overdueEntities) {
      if (this.isOverdue(entity, entityType, thresholdHours)) {
        // Get next approver in hierarchy
        const nextApprovers = await this.getCurrentStageApprovers(
          entityType,
          entity.approvalStage,
          entity
        );

        // Create escalation notification
        await notificationService.createWorkflowNotification(
          entity,
          entityType,
          'overdue_escalation',
          null,
          { thresholdHours, approvers: nextApprovers }
        );

        // Emit escalation event
        await eventBus.emit('workflow:escalated', {
          entityType,
          entityId: entity.id,
          stage: entity.approvalStage,
          thresholdHours
        });

        escalated++;
      }
    }

    return escalated;
  }
}

module.exports = WorkflowEngine;

