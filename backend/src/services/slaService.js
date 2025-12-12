// src/services/slaService.js
// SLA Service - Calculates SLA, tracks overdue items, and handles auto-escalation

const { Op } = require('sequelize');
const WorkflowEngine = require('./workflowEngine');
const notificationService = require('./notificationService');
const eventBus = require('./eventBus');

/**
 * SLA Service - Manages SLA calculations and monitoring
 */
class SLAService {
  /**
   * SLA thresholds in hours per entity type
   */
  static THRESHOLDS = {
    order: 48,
    invoice: 48,
    payment: 36,
    document: 24,
    pricing: 24,
    campaign: 24
  };

  /**
   * Calculate SLA status for an entity
   * @param {Object} entity - Entity object
   * @param {string} entityType - Type of entity
   * @returns {Object} SLA status
   */
  calculateSLAStatus(entity, entityType) {
    if (!entity.approvalStage || entity.approvalStatus !== 'pending') {
      return {
        status: 'not_applicable',
        hoursElapsed: 0,
        hoursRemaining: 0,
        percentageUsed: 0
      };
    }

    const threshold = this.THRESHOLDS[entityType] || 48;
    const startTime = entity.approvedAt || entity.createdAt;
    if (!startTime) {
      return {
        status: 'unknown',
        hoursElapsed: 0,
        hoursRemaining: threshold,
        percentageUsed: 0
      };
    }

    const hoursElapsed = (new Date() - new Date(startTime)) / (1000 * 60 * 60);
    const hoursRemaining = Math.max(0, threshold - hoursElapsed);
    const percentageUsed = Math.min(100, (hoursElapsed / threshold) * 100);

    let status = 'on_time';
    if (hoursElapsed > threshold) {
      status = 'breached';
    } else if (percentageUsed >= 80) {
      status = 'at_risk';
    }

    return {
      status,
      hoursElapsed: Math.round(hoursElapsed * 100) / 100,
      hoursRemaining: Math.round(hoursRemaining * 100) / 100,
      percentageUsed: Math.round(percentageUsed * 100) / 100,
      threshold
    };
  }

  /**
   * Check and mark overdue entities
   * @param {string} entityType - Type of entity
   * @param {number} thresholdHours - Optional custom threshold
   * @returns {Promise<number>} Number of overdue entities found
   */
  async checkOverdueEntities(entityType, thresholdHours = null) {
    const threshold = thresholdHours || this.THRESHOLDS[entityType] || 48;
    const models = require('../models');
    const Model = models[entityType.charAt(0).toUpperCase() + entityType.slice(1)];
    
    if (!Model) return 0;

    const pendingEntities = await Model.findAll({
      where: {
        approvalStatus: 'pending',
        approvalStage: { [Op.ne]: null }
      }
    });

    let overdueCount = 0;

    for (const entity of pendingEntities) {
      if (WorkflowEngine.isOverdue(entity, entityType, threshold)) {
        // Mark as overdue if model supports it
        if (entity.isOverdue !== undefined) {
          await entity.update({ isOverdue: true });
        }

        // Create overdue notification
        await notificationService.createWorkflowNotification(
          entity,
          entityType,
          'overdue_escalation',
          null,
          { thresholdHours: threshold }
        );

        // Emit escalation event
        await eventBus.emit('workflow:escalated', {
          entityType,
          entityId: entity.id,
          stage: entity.approvalStage,
          thresholdHours: threshold
        });

        overdueCount++;
      }
    }

    return overdueCount;
  }

  /**
   * Run SLA checks for all entity types
   * @returns {Promise<Object>} Results of SLA checks
   */
  async runSLAChecks() {
    const results = {};

    for (const [entityType, threshold] of Object.entries(this.THRESHOLDS)) {
      try {
        results[entityType] = await this.checkOverdueEntities(entityType, threshold);
      } catch (err) {
        console.error(`Error checking SLA for ${entityType}:`, err);
        results[entityType] = 0;
      }
    }

    return {
      results,
      ranAt: new Date(),
      totalOverdue: Object.values(results).reduce((sum, count) => sum + count, 0)
    };
  }

  /**
   * Auto-escalate overdue entities
   * @param {string} entityType - Type of entity
   * @param {number} thresholdHours - Threshold hours
   * @returns {Promise<number>} Number of escalated entities
   */
  async autoEscalateOverdue(entityType, thresholdHours = null) {
    return await WorkflowEngine.autoEscalateOverdue(
      entityType,
      thresholdHours || this.THRESHOLDS[entityType] || 48
    );
  }

  /**
   * Get SLA summary for dashboard
   * @param {Object} user - User object
   * @returns {Promise<Object>} SLA summary
   */
  async getSLASummary(user) {
    const taskService = require('./taskService');
    const tasks = await taskService.getTasksForUser(user);

    const summary = {
      total: tasks.total,
      overdue: tasks.overdue,
      atRisk: 0,
      onTime: 0,
      byType: {}
    };

    // Calculate at-risk and on-time counts
    tasks.tasks.forEach(task => {
      const slaStatus = this.calculateSLAStatus(
        { approvalStage: task.stage, approvalStatus: 'pending', createdAt: task.createdAt },
        task.type
      );

      if (slaStatus.status === 'at_risk') {
        summary.atRisk++;
      } else if (slaStatus.status === 'on_time') {
        summary.onTime++;
      }

      if (!summary.byType[task.type]) {
        summary.byType[task.type] = { total: 0, overdue: 0, atRisk: 0, onTime: 0 };
      }

      summary.byType[task.type].total++;
      if (task.isOverdue) summary.byType[task.type].overdue++;
      if (slaStatus.status === 'at_risk') summary.byType[task.type].atRisk++;
      if (slaStatus.status === 'on_time') summary.byType[task.type].onTime++;
    });

    return summary;
  }
}

module.exports = new SLAService();

