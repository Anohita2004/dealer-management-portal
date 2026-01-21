// src/services/notificationService.js
// Enhanced Notification Service with Role-targeting and Hierarchy-based broadcasts

const { Notification, User, Role, Dealer, Territory, Area, Region } = require('../models');
const { Op } = require('sequelize');
const RBACEngine = require('./rbacEngine');

/**
 * Notification Service - Handles all notification creation and delivery
 */
class NotificationService {
  /**
   * Create notification for a single user
   * @param {Object} options - Notification options
   * @returns {Promise<Object>} Created notification
   */
  async createUserNotification(options) {
    const {
      userId,
      title,
      message,
      type = 'info',
      priority = 'normal',
      actionUrl,
      relatedId,
      relatedType,
      data = {}
    } = options;

    const notification = await Notification.create({
      recipientId: userId,
      title,
      message,
      type,
      priority,
      actionUrl,
      relatedId,
      relatedType,
      data,
      isRead: false
    });

    // Emit real-time notification
    this.emitRealtimeNotification(userId, notification);

    return notification;
  }

  /**
   * Create notifications for all users with a specific role
   * @param {Object} options - Notification options
   * @returns {Promise<Array>} Created notifications
   */
  async createRoleNotification(options) {
    const {
      roleName,
      title,
      message,
      type = 'info',
      priority = 'normal',
      actionUrl,
      relatedId,
      relatedType,
      scope = {}, // Optional: { regionId, areaId, territoryId, dealerId }
      data = {}
    } = options;

    // Get role
    const role = await Role.findOne({ where: { name: roleName } });
    if (!role) {
      throw new Error(`Role ${roleName} not found`);
    }

    // Build user query with optional scope filtering
    const userWhere = { roleId: role.id, isActive: true };
    if (scope.regionId) userWhere.regionId = scope.regionId;
    if (scope.areaId) userWhere.areaId = scope.areaId;
    if (scope.territoryId) userWhere.territoryId = scope.territoryId;
    if (scope.dealerId) userWhere.dealerId = scope.dealerId;

    const users = await User.findAll({
      where: userWhere,
      attributes: ['id']
    });

    // Create notifications for all users
    const notifications = await Promise.all(
      users.map(user =>
        Notification.create({
          recipientId: user.id,
          title,
          message,
          type,
          priority,
          actionUrl,
          relatedId,
          relatedType,
          data,
          isRead: false
        })
      )
    );

    // Emit real-time notifications
    notifications.forEach(notification => {
      this.emitRealtimeNotification(notification.recipientId, notification);
    });

    return notifications;
  }

  /**
   * Create hierarchy-based broadcast notification
   * Notifies users at a specific hierarchy level and optionally their managers
   * @param {Object} options - Notification options
   * @returns {Promise<Array>} Created notifications
   */
  async createHierarchyBroadcast(options) {
    const {
      hierarchyLevel, // 'region', 'area', 'territory', 'dealer'
      hierarchyId, // ID of the hierarchy entity
      title,
      message,
      type = 'info',
      priority = 'normal',
      actionUrl,
      relatedId,
      relatedType,
      includeManagers = false, // Also notify managers above this level
      data = {}
    } = options;

    let userIds = [];

    switch (hierarchyLevel) {
      case 'region':
        const regionUsers = await User.findAll({
          where: { regionId: hierarchyId, isActive: true },
          attributes: ['id']
        });
        userIds = regionUsers.map(u => u.id);

        if (includeManagers) {
          // Get regional managers
          const region = await Region.findByPk(hierarchyId);
          // Regional managers are already included above
        }
        break;

      case 'area':
        const areaUsers = await User.findAll({
          where: { areaId: hierarchyId, isActive: true },
          attributes: ['id']
        });
        userIds = areaUsers.map(u => u.id);

        if (includeManagers) {
          const area = await Area.findByPk(hierarchyId, {
            include: [{ model: Region, as: 'region' }]
          });
          if (area && area.regionId) {
            const regionalManagers = await User.findAll({
              where: {
                regionId: area.regionId,
                roleId: { [Op.in]: await this.getManagerRoleIds(['regional_manager', 'regional_admin']) },
                isActive: true
              },
              attributes: ['id']
            });
            userIds = userIds.concat(regionalManagers.map(u => u.id));
          }
        }
        break;

      case 'territory':
        const territoryUsers = await User.findAll({
          where: { territoryId: hierarchyId, isActive: true },
          attributes: ['id']
        });
        userIds = territoryUsers.map(u => u.id);

        if (includeManagers) {
          const territory = await Territory.findByPk(hierarchyId, {
            include: [
              { model: Area, as: 'area' },
              { model: Region, as: 'region' }
            ]
          });
          if (territory) {
            // Get area managers
            if (territory.areaId) {
              const areaManagers = await User.findAll({
                where: {
                  areaId: territory.areaId,
                  roleId: { [Op.in]: await this.getManagerRoleIds(['area_manager']) },
                  isActive: true
                },
                attributes: ['id']
              });
              userIds = userIds.concat(areaManagers.map(u => u.id));
            }
            // Get regional managers
            if (territory.regionId) {
              const regionalManagers = await User.findAll({
                where: {
                  regionId: territory.regionId,
                  roleId: { [Op.in]: await this.getManagerRoleIds(['regional_manager', 'regional_admin']) },
                  isActive: true
                },
                attributes: ['id']
              });
              userIds = userIds.concat(regionalManagers.map(u => u.id));
            }
          }
        }
        break;

      case 'dealer':
        const dealer = await Dealer.findByPk(hierarchyId, {
          include: [
            { model: Territory, as: 'territoryRelation' },
            { model: Area, as: 'area' },
            { model: Region, as: 'region' }
          ]
        });

        if (dealer) {
          // Get dealer users
          const dealerUsers = await User.findAll({
            where: { dealerId: hierarchyId, isActive: true },
            attributes: ['id']
          });
          userIds = dealerUsers.map(u => u.id);

          if (includeManagers) {
            // Get territory manager
            if (dealer.territoryId) {
              const territoryManagers = await User.findAll({
                where: {
                  territoryId: dealer.territoryId,
                  roleId: { [Op.in]: await this.getManagerRoleIds(['territory_manager']) },
                  isActive: true
                },
                attributes: ['id']
              });
              userIds = userIds.concat(territoryManagers.map(u => u.id));
            }
            // Get area manager
            if (dealer.areaId) {
              const areaManagers = await User.findAll({
                where: {
                  areaId: dealer.areaId,
                  roleId: { [Op.in]: await this.getManagerRoleIds(['area_manager']) },
                  isActive: true
                },
                attributes: ['id']
              });
              userIds = userIds.concat(areaManagers.map(u => u.id));
            }
            // Get regional manager
            if (dealer.regionId) {
              const regionalManagers = await User.findAll({
                where: {
                  regionId: dealer.regionId,
                  roleId: { [Op.in]: await this.getManagerRoleIds(['regional_manager', 'regional_admin']) },
                  isActive: true
                },
                attributes: ['id']
              });
              userIds = userIds.concat(regionalManagers.map(u => u.id));
            }
          }
        }
        break;
    }

    // Remove duplicates
    userIds = [...new Set(userIds)];

    // Create notifications
    const notifications = await Promise.all(
      userIds.map(userId =>
        Notification.create({
          recipientId: userId,
          title,
          message,
          type,
          priority,
          actionUrl,
          relatedId,
          relatedType,
          data,
          isRead: false
        })
      )
    );

    // Emit real-time notifications
    notifications.forEach(notification => {
      this.emitRealtimeNotification(notification.recipientId, notification);
    });

    return notifications;
  }

  /**
   * Create workflow notification
   * @param {Object} entity - Entity (Order, Invoice, etc.)
   * @param {string} entityType - Type of entity
   * @param {string} action - Action type ('pending_approval', 'approved', 'rejected', 'overdue_escalation')
   * @param {Object} actor - User performing the action
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Created notifications
   */
  async createWorkflowNotification(entity, entityType, action, actor, options = {}) {
    const { nextStage, reason, notes, thresholdHours, approvers } = options;

    let title, message, priority = 'normal';
    let targetUsers = [];

    switch (action) {
      case 'pending_approval':
        title = `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Pending Approval`;
        message = `A ${entityType} (${entity.id}) is pending your approval at stage: ${nextStage}`;
        priority = 'high';
        // Get approvers for next stage
        const WorkflowEngine = require('./workflowEngine');
        targetUsers = await WorkflowEngine.getCurrentStageApprovers(entityType, nextStage, entity);
        break;

      case 'approved':
        title = `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Approved`;
        message = `Your ${entityType} (${entity.id}) has been approved${nextStage ? ` and moved to ${nextStage}` : ''}`;
        priority = 'normal';
        // Notify entity creator/owner
        if (entity.dealerId) {
          const dealerUsers = await User.findAll({
            where: { dealerId: entity.dealerId, isActive: true },
            attributes: ['id']
          });
          targetUsers = dealerUsers.map(u => u.id);
        }
        break;

      case 'rejected':
        title = `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Rejected`;
        message = `Your ${entityType} (${entity.id}) has been rejected. Reason: ${reason || 'No reason provided'}`;
        priority = 'high';
        // Notify entity creator/owner
        if (entity.dealerId) {
          const dealerUsers = await User.findAll({
            where: { dealerId: entity.dealerId, isActive: true },
            attributes: ['id']
          });
          targetUsers = dealerUsers.map(u => u.id);
        }
        break;

      case 'overdue_escalation':
        title = `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Overdue`;
        message = `A ${entityType} (${entity.id}) has been pending for more than ${thresholdHours} hours at stage: ${entity.approvalStage}`;
        priority = 'urgent';
        // Notify managers
        if (approvers && approvers.length > 0) {
          targetUsers = approvers;
        } else {
          const WorkflowEngine = require('./workflowEngine');
          targetUsers = await WorkflowEngine.getCurrentStageApprovers(entityType, entity.approvalStage, entity);
        }
        break;
    }

    // Create notifications
    const notifications = await Promise.all(
      targetUsers.map(userId =>
        Notification.create({
          recipientId: userId,
          senderId: actor?.id,
          title,
          message,
          type: entityType,
          priority,
          relatedId: entity.id,
          relatedType: entityType,
          actionUrl: `/${entityType}s/${entity.id}`,
          data: { action, nextStage, reason, notes },
          isRead: false
        })
      )
    );

    // Emit real-time notifications
    notifications.forEach(notification => {
      this.emitRealtimeNotification(notification.recipientId, notification);
    });

    return notifications;
  }

  /**
   * Notify dealer/finance at each workflow step
   */
  async notifyWorkflowStep(entityType, entity, step, user, extra = {}) {
    let title = `${entityType} ${step}`;
    let message = `Status update for ${entityType}: ${step}`;
    let relatedId = entity.id;
    let relatedType = entityType;
    let recipients = [];
    if (entityType === 'delivery') {
      recipients.push(entity.dealerId);
    } else if (entityType === 'goods_receipt') {
      recipients.push(entity.dealerId);
    } else if (entityType === 'invoice') {
      recipients.push(entity.dealerId);
      // Add finance team notification
      recipients = recipients.concat(await RBACEngine.getUsersByRole('finance_admin'));
    } else if (entityType === 'payment') {
      recipients.push(entity.dealerId);
      recipients = recipients.concat(await RBACEngine.getUsersByRole('finance_admin'));
    }
    for (const recipientId of recipients) {
      await this.createUserNotification({
        userId: recipientId,
        title,
        message,
        type: 'info',
        priority: 'normal',
        relatedId,
        relatedType,
        data: extra
      });
    }
  }

  // ============================================
  // SPECIFIC NOTIFICATION METHODS
  // ============================================

  async notifyOrderCreated(order) {
    return this.createHierarchyBroadcast({
      hierarchyLevel: 'dealer',
      hierarchyId: order.dealerId,
      title: 'New Order Created',
      message: `A new order (${order.orderNumber}) has been created`,
      type: 'order',
      relatedId: order.id,
      relatedType: 'order',
      includeManagers: true,
      actionUrl: `/orders/${order.id}`
    });
  }

  async notifyOrderApproved(order) {
    return this.createHierarchyBroadcast({
      hierarchyLevel: 'dealer',
      hierarchyId: order.dealerId,
      title: 'Order Approved',
      message: `Order ${order.orderNumber} has been fully approved`,
      type: 'order',
      relatedId: order.id,
      relatedType: 'order',
      actionUrl: `/orders/${order.id}`
    });
  }

  async notifyOrderRejected(order, reason) {
    return this.createHierarchyBroadcast({
      hierarchyLevel: 'dealer',
      hierarchyId: order.dealerId,
      title: 'Order Rejected',
      message: `Order ${order.orderNumber} has been rejected. Reason: ${reason}`,
      type: 'order',
      relatedId: order.id,
      relatedType: 'order',
      actionUrl: `/orders/${order.id}`
    });
  }

  async notifyInvoiceCreated(invoice) {
    return this.createHierarchyBroadcast({
      hierarchyLevel: 'dealer',
      hierarchyId: invoice.dealerId,
      title: 'New Invoice Created',
      message: `A new invoice has been created`,
      type: 'invoice',
      relatedId: invoice.id,
      relatedType: 'invoice',
      includeManagers: true,
      actionUrl: `/invoices/${invoice.id}`
    });
  }

  async notifyInvoiceApproved(invoice) {
    return this.createHierarchyBroadcast({
      hierarchyLevel: 'dealer',
      hierarchyId: invoice.dealerId,
      title: 'Invoice Approved',
      message: `Invoice has been approved`,
      type: 'invoice',
      relatedId: invoice.id,
      relatedType: 'invoice',
      actionUrl: `/invoices/${invoice.id}`
    });
  }

  async notifyInvoiceRejected(invoice, reason) {
    return this.createHierarchyBroadcast({
      hierarchyLevel: 'dealer',
      hierarchyId: invoice.dealerId,
      title: 'Invoice Rejected',
      message: `Invoice has been rejected. Reason: ${reason}`,
      type: 'invoice',
      relatedId: invoice.id,
      relatedType: 'invoice',
      actionUrl: `/invoices/${invoice.id}`
    });
  }

  async notifyPaymentCreated(payment) {
    return this.createHierarchyBroadcast({
      hierarchyLevel: 'dealer',
      hierarchyId: payment.dealerId,
      title: 'New Payment Request',
      message: `A new payment request has been created`,
      type: 'payment',
      relatedId: payment.id,
      relatedType: 'payment',
      includeManagers: true,
      actionUrl: `/payments/${payment.id}`
    });
  }

  async notifyPaymentApproved(payment) {
    return this.createHierarchyBroadcast({
      hierarchyLevel: 'dealer',
      hierarchyId: payment.dealerId,
      title: 'Payment Approved',
      message: `Payment request has been approved`,
      type: 'payment',
      relatedId: payment.id,
      relatedType: 'payment',
      actionUrl: `/payments/${payment.id}`
    });
  }

  async notifyLowStock(material, currentStock, threshold) {
    return this.createRoleNotification({
      roleName: 'inventory_user',
      title: 'Low Stock Alert',
      message: `Material ${material.name} is low on stock. Current: ${currentStock}, Threshold: ${threshold}`,
      type: 'inventory',
      priority: 'high',
      relatedId: material.id,
      relatedType: 'material',
      actionUrl: `/inventory/${material.id}`
    });
  }

  async notifyWorkflowEscalation(entityType, entityId, stage) {
    return this.createRoleNotification({
      roleName: 'regional_manager',
      title: 'Workflow Escalation',
      message: `A ${entityType} (${entityId}) has been pending at stage ${stage} for too long`,
      type: 'workflow',
      priority: 'urgent',
      relatedId: entityId,
      relatedType: entityType,
      actionUrl: `/${entityType}s/${entityId}`
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  async getManagerRoleIds(roleNames) {
    const roles = await Role.findAll({
      where: { name: { [Op.in]: roleNames } },
      attributes: ['id']
    });
    return roles.map(r => r.id);
  }

  emitRealtimeNotification(userId, notification) {
    // This will be called from server.js where io is available
    // For now, we'll store it in a way that server.js can pick it up
    if (global.io) {
      global.io.to(`user:${userId}`).emit('notification', {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        actionUrl: notification.actionUrl,
        createdAt: notification.createdAt
      });
    }
  }
}

module.exports = new NotificationService();

