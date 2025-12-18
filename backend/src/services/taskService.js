// src/services/taskService.js
// Task Service with SLA tracking and task queues

const { Order, Invoice, PaymentRequest, Document, PricingUpdate, Dealer, User } = require('../models');
const { Op } = require('sequelize');
const RBACEngine = require('./rbacEngine');
const WorkflowEngine = require('./workflowEngine');

/**
 * Task Service - Manages tasks, queues, and SLA tracking
 */
class TaskService {
  /**
   * Get tasks for a user based on their role and scope
   * @param {Object} user - User object
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Tasks grouped by type
   */
  async getTasksForUser(user, options = {}) {
    const { type, priority, overdue } = options;
    const roleName = user.roleDetails?.name || user.role;
    const tasks = [];

    // Get dealers under user's scope
    const dealerIds = await RBACEngine.getDealersInScope(user);

    // Pending Orders
    if (!type || type === 'order') {
      if (['territory_manager', 'area_manager', 'regional_manager', 'regional_admin'].includes(roleName)) {
        const whereClause = {
          approvalStatus: 'pending',
          dealerId: { [Op.in]: dealerIds }
        };

        if (overdue) {
          whereClause.createdAt = { [Op.lt]: new Date(Date.now() - 48 * 60 * 60 * 1000) };
        }

        const pendingOrders = await Order.findAll({
          where: whereClause,
          include: [{ model: Dealer, as: 'dealer', attributes: ['id', 'businessName', 'dealerCode'] }],
          order: [['createdAt', 'ASC']],
          limit: 50
        });

        tasks.push(...pendingOrders.map(o => ({
          id: o.id,
          type: 'order',
          title: `Order ${o.orderNumber} requires approval`,
          entityId: o.id,
          dealerName: o.dealer?.businessName,
          createdAt: o.createdAt,
          stage: o.approvalStage,
          priority: this.calculatePriority(o, 'order'),
          isOverdue: this.isOverdue(o, 'order'),
          slaHours: this.getSLAHours('order'),
          hoursElapsed: this.getHoursElapsed(o),
          actionUrl: `/orders/${o.id}`
        })));
      }
    }

    // Pending Invoices
    if (!type || type === 'invoice') {
      if (['dealer_admin', 'territory_manager', 'area_manager', 'regional_manager', 'regional_admin'].includes(roleName)) {
        const whereClause = {
          approvalStatus: 'pending',
          ...(roleName.startsWith('dealer_') ? { dealerId: user.dealerId } : { dealerId: { [Op.in]: dealerIds } })
        };

        if (overdue) {
          whereClause.createdAt = { [Op.lt]: new Date(Date.now() - 48 * 60 * 60 * 1000) };
        }

        const pendingInvoices = await Invoice.findAll({
          where: whereClause,
          include: [{ model: Dealer, as: 'dealer', attributes: ['id', 'businessName', 'dealerCode'] }],
          order: [['createdAt', 'ASC']],
          limit: 50
        });

        tasks.push(...pendingInvoices.map(i => ({
          id: i.id,
          type: 'invoice',
          title: `Invoice ${i.invoiceNumber} requires approval`,
          entityId: i.id,
          dealerName: i.dealer?.businessName,
          createdAt: i.createdAt,
          stage: i.approvalStage,
          priority: this.calculatePriority(i, 'invoice'),
          isOverdue: this.isOverdue(i, 'invoice'),
          slaHours: this.getSLAHours('invoice'),
          hoursElapsed: this.getHoursElapsed(i),
          actionUrl: `/invoices/${i.id}`
        })));
      }
    }

    // Pending Payments
    if (!type || type === 'payment') {
      if (['dealer_admin', 'finance_admin'].includes(roleName)) {
        const whereClause = {
          approvalStatus: 'pending',
          ...(roleName === 'dealer_admin' ? { dealerId: user.dealerId } : {})
        };

        if (overdue) {
          whereClause.createdAt = { [Op.lt]: new Date(Date.now() - 36 * 60 * 60 * 1000) };
        }

        const pendingPayments = await PaymentRequest.findAll({
          where: whereClause,
          include: [{ model: Dealer, as: 'dealer', attributes: ['id', 'businessName', 'dealerCode'] }],
          order: [['createdAt', 'ASC']],
          limit: 50
        });

        tasks.push(...pendingPayments.map(p => ({
          id: p.id,
          type: 'payment',
          title: `Payment request ${p.id} requires approval`,
          entityId: p.id,
          dealerName: p.dealer?.businessName,
          createdAt: p.createdAt,
          stage: p.approvalStage,
          priority: this.calculatePriority(p, 'payment'),
          isOverdue: this.isOverdue(p, 'payment'),
          slaHours: this.getSLAHours('payment'),
          hoursElapsed: this.getHoursElapsed(p),
          actionUrl: `/payments/${p.id}`
        })));
      }
    }

    // Pending Documents
    if (!type || type === 'document') {
      if (['dealer_admin', 'territory_manager', 'area_manager', 'regional_manager'].includes(roleName)) {
        const whereClause = {
          approvalStatus: 'pending',
          ...(roleName.startsWith('dealer_') ? { dealerId: user.dealerId } : { dealerId: { [Op.in]: dealerIds } })
        };

        if (overdue) {
          whereClause.createdAt = { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) };
        }

        const pendingDocs = await Document.findAll({
          where: whereClause,
          include: [{ model: Dealer, as: 'dealer', attributes: ['id', 'businessName', 'dealerCode'] }],
          order: [['createdAt', 'ASC']],
          limit: 50
        });

        tasks.push(...pendingDocs.map(d => ({
          id: d.id,
          type: 'document',
          title: `Document ${d.documentName} requires approval`,
          entityId: d.id,
          dealerName: d.dealer?.businessName,
          createdAt: d.createdAt,
          stage: d.approvalStage,
          priority: this.calculatePriority(d, 'document'),
          isOverdue: this.isOverdue(d, 'document'),
          slaHours: this.getSLAHours('document'),
          hoursElapsed: this.getHoursElapsed(d),
          actionUrl: `/documents/${d.id}`
        })));
      }
    }

    // Pending Pricing
    if (!type || type === 'pricing') {
      if (['area_manager', 'regional_admin', 'super_admin'].includes(roleName)) {
        const whereClause = {
          approvalStatus: 'pending',
          ...(roleName !== 'super_admin' ? { dealerId: { [Op.in]: dealerIds } } : {})
        };

        if (overdue) {
          whereClause.createdAt = { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) };
        }

        const pendingPricing = await PricingUpdate.findAll({
          where: whereClause,
          include: [{ model: Dealer, as: 'dealer', attributes: ['id', 'businessName', 'dealerCode'] }],
          order: [['createdAt', 'ASC']],
          limit: 50
        });

        tasks.push(...pendingPricing.map(p => ({
          id: p.id,
          type: 'pricing',
          title: `Pricing request ${p.id} requires approval`,
          entityId: p.id,
          dealerName: p.dealer?.businessName,
          createdAt: p.createdAt,
          stage: p.approvalStage,
          priority: this.calculatePriority(p, 'pricing'),
          isOverdue: this.isOverdue(p, 'pricing'),
          slaHours: this.getSLAHours('pricing'),
          hoursElapsed: this.getHoursElapsed(p),
          actionUrl: `/pricing/${p.id}`
        })));
      }
    }

    // Filter by priority if specified
    let filteredTasks = tasks;
    if (priority) {
      filteredTasks = tasks.filter(t => t.priority === priority);
    }

    // Sort by priority and creation date
    filteredTasks.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    return {
      tasks: filteredTasks,
      total: filteredTasks.length,
      overdue: filteredTasks.filter(t => t.isOverdue).length,
      byType: {
        order: filteredTasks.filter(t => t.type === 'order').length,
        invoice: filteredTasks.filter(t => t.type === 'invoice').length,
        payment: filteredTasks.filter(t => t.type === 'payment').length,
        document: filteredTasks.filter(t => t.type === 'document').length,
        pricing: filteredTasks.filter(t => t.type === 'pricing').length
      },
      byPriority: {
        urgent: filteredTasks.filter(t => t.priority === 'urgent').length,
        high: filteredTasks.filter(t => t.priority === 'high').length,
        normal: filteredTasks.filter(t => t.priority === 'normal').length,
        low: filteredTasks.filter(t => t.priority === 'low').length
      }
    };
  }

  /**
   * Create workflow task (virtual task for tracking)
   * @param {string} entityType - Type of entity
   * @param {string} entityId - Entity ID
   * @param {string} stage - Current approval stage
   * @returns {Promise<void>}
   */
  async createWorkflowTask(entityType, entityId, stage) {
    // Tasks are virtual - they're generated from pending entities
    // This method is for logging/tracking purposes
    console.log(`Workflow task created: ${entityType} ${entityId} at stage ${stage}`);
  }

  /**
   * Complete workflow tasks for an entity
   * @param {string} entityType - Type of entity
   * @param {string} entityId - Entity ID
   * @returns {Promise<void>}
   */
  async completeWorkflowTasks(entityType, entityId) {
    // Tasks are virtual - this is for logging
    console.log(`Workflow tasks completed: ${entityType} ${entityId}`);
  }

  /**
   * Cancel workflow tasks for an entity
   * @param {string} entityType - Type of entity
   * @param {string} entityId - Entity ID
   * @returns {Promise<void>}
   */
  async cancelWorkflowTasks(entityType, entityId) {
    // Tasks are virtual - this is for logging
    console.log(`Workflow tasks cancelled: ${entityType} ${entityId}`);
  }

  /**
   * Create reorder task for low stock material
   * @param {string} materialId - Material ID
   * @returns {Promise<void>}
   */
  async createReorderTask(materialId) {
    // This could create a notification or actual task record if Task model exists
    console.log(`Reorder task created for material ${materialId}`);
  }

  /**
   * Calculate task priority based on SLA and elapsed time
   * @param {Object} entity - Entity object
   * @param {string} entityType - Type of entity
   * @returns {string} Priority level
   */
  calculatePriority(entity, entityType) {
    const hoursElapsed = this.getHoursElapsed(entity);
    const slaHours = this.getSLAHours(entityType);
    const threshold = slaHours * 0.8; // 80% of SLA

    if (hoursElapsed > slaHours) {
      return 'urgent';
    } else if (hoursElapsed > threshold) {
      return 'high';
    } else {
      return 'normal';
    }
  }

  /**
   * Check if entity is overdue
   * @param {Object} entity - Entity object
   * @param {string} entityType - Type of entity
   * @returns {boolean}
   */
  isOverdue(entity, entityType) {
    return WorkflowEngine.isOverdue(entity, entityType, this.getSLAHours(entityType));
  }

  /**
   * Get hours elapsed since entity was created or last approved
   * @param {Object} entity - Entity object
   * @returns {number}
   */
  getHoursElapsed(entity) {
    const startTime = entity.approvedAt || entity.createdAt;
    if (!startTime) return 0;
    return (new Date() - new Date(startTime)) / (1000 * 60 * 60);
  }

  /**
   * Get SLA hours for entity type
   * @param {string} entityType - Type of entity
   * @returns {number} SLA hours
   */
  getSLAHours(entityType) {
    const SLAs = {
      order: 48,
      invoice: 48,
      payment: 36,
      document: 24,
      pricing: 24,
      campaign: 24
    };
    return SLAs[entityType] || 48;
  }

  /**
   * Mark entity as overdue
   * @param {string} entityType - Type of entity
   * @param {string} entityId - Entity ID
   * @returns {Promise<void>}
   */
  async markOverdue(entityType, entityId) {
    const models = require('../models');
    const Model = models[entityType.charAt(0).toUpperCase() + entityType.slice(1)];
    if (!Model) return;

    await Model.update(
      { isOverdue: true },
      { where: { id: entityId } }
    );
  }

  /**
   * Get dashboard indicators for tasks
   * @param {Object} user - User object
   * @returns {Promise<Object>} Dashboard indicators
   */
  async getDashboardIndicators(user) {
    const tasks = await this.getTasksForUser(user);

    return {
      totalTasks: tasks.total,
      overdueTasks: tasks.overdue,
      tasksByType: tasks.byType,
      tasksByPriority: tasks.byPriority,
      urgentTasks: tasks.tasks.filter(t => t.priority === 'urgent').length,
      highPriorityTasks: tasks.tasks.filter(t => t.priority === 'high').length
    };
  }
}

module.exports = new TaskService();

