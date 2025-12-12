// src/services/eventBus.js
// Event Bus / Automation Layer
// Handles system-wide events and triggers automated actions

const EventEmitter = require('events');

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Allow many listeners
    this.setupDefaultHandlers();
  }

  /**
   * Setup default event handlers for common workflows
   */
  setupDefaultHandlers() {
    // Order events
    this.on('order:created', this.handleOrderCreated.bind(this));
    this.on('order:approved', this.handleOrderApproved.bind(this));
    this.on('order:rejected', this.handleOrderRejected.bind(this));

    // Invoice events
    this.on('invoice:created', this.handleInvoiceCreated.bind(this));
    this.on('invoice:approved', this.handleInvoiceApproved.bind(this));
    this.on('invoice:rejected', this.handleInvoiceRejected.bind(this));

    // Payment events
    this.on('payment:created', this.handlePaymentCreated.bind(this));
    this.on('payment:approved', this.handlePaymentApproved.bind(this));

    // Workflow events
    this.on('workflow:stage_transition', this.handleStageTransition.bind(this));
    this.on('workflow:approved', this.handleWorkflowApproved.bind(this));
    this.on('workflow:rejected', this.handleWorkflowRejected.bind(this));
    this.on('workflow:escalated', this.handleWorkflowEscalated.bind(this));

    // Inventory events
    this.on('inventory:low_stock', this.handleLowStock.bind(this));
    this.on('inventory:reorder_threshold', this.handleReorderThreshold.bind(this));
  }

  /**
   * Emit event with error handling
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  async emit(event, data) {
    try {
      super.emit(event, data);
      // Also emit to a catch-all handler for logging
      super.emit('*', { event, data });
    } catch (err) {
      console.error(`Error emitting event ${event}:`, err);
    }
  }

  // ============================================
  // ORDER EVENT HANDLERS
  // ============================================

  async handleOrderCreated(data) {
    const { orderId, dealerId } = data;
    const notificationService = require('./notificationService');
    const { Order, Dealer } = require('../models');

    try {
      const order = await Order.findByPk(orderId);
      if (!order) return;

      // Notify territory manager
      await notificationService.notifyOrderCreated(order);
    } catch (err) {
      console.error('Error handling order:created:', err);
    }
  }

  async handleOrderApproved(data) {
    const { orderId } = data;
    const { Order, OrderItem, Material } = require('../models');

    try {
      const order = await Order.findByPk(orderId, {
        include: [{ model: OrderItem, as: 'items' }]
      });

      if (!order) return;

      // Auto-reduce stock
      for (const item of order.items) {
        const material = await Material.findByPk(item.materialId);
        if (material) {
          const newStock = Math.max(0, (material.stock || 0) - item.qty);
          await material.update({ stock: newStock });

          // Check for low stock
          if (material.reorderThreshold && newStock <= material.reorderThreshold) {
            this.emit('inventory:low_stock', {
              materialId: material.id,
              currentStock: newStock,
              threshold: material.reorderThreshold
            });
          }
        }
      }

      // Notify dealer
      const notificationService = require('./notificationService');
      await notificationService.notifyOrderApproved(order);
    } catch (err) {
      console.error('Error handling order:approved:', err);
    }
  }

  async handleOrderRejected(data) {
    const { orderId, reason } = data;
    const notificationService = require('./notificationService');
    const { Order } = require('../models');

    try {
      const order = await Order.findByPk(orderId);
      if (!order) return;

      // Notify dealer about rejection
      await notificationService.notifyOrderRejected(order, reason);
    } catch (err) {
      console.error('Error handling order:rejected:', err);
    }
  }

  // ============================================
  // INVOICE EVENT HANDLERS
  // ============================================

  async handleInvoiceCreated(data) {
    const { invoiceId } = data;
    const notificationService = require('./notificationService');
    const { Invoice } = require('../models');

    try {
      const invoice = await Invoice.findByPk(invoiceId);
      if (!invoice) return;

      // Notify approvers
      await notificationService.notifyInvoiceCreated(invoice);
    } catch (err) {
      console.error('Error handling invoice:created:', err);
    }
  }

  async handleInvoiceApproved(data) {
    const { invoiceId } = data;
    const { Invoice, Dealer } = require('../models');

    try {
      const invoice = await Invoice.findByPk(invoiceId);
      if (!invoice) return;

      // Update dealer outstanding amount
      const dealer = await Dealer.findByPk(invoice.dealerId);
      if (dealer) {
        const newOutstanding = (dealer.outstandingAmount || 0) + (invoice.totalAmount || 0);
        await dealer.update({ outstandingAmount: newOutstanding });
      }

      // Notify dealer
      const notificationService = require('./notificationService');
      await notificationService.notifyInvoiceApproved(invoice);
    } catch (err) {
      console.error('Error handling invoice:approved:', err);
    }
  }

  async handleInvoiceRejected(data) {
    const { invoiceId, reason } = data;
    const notificationService = require('./notificationService');
    const { Invoice } = require('../models');

    try {
      const invoice = await Invoice.findByPk(invoiceId);
      if (!invoice) return;

      await notificationService.notifyInvoiceRejected(invoice, reason);
    } catch (err) {
      console.error('Error handling invoice:rejected:', err);
    }
  }

  // ============================================
  // PAYMENT EVENT HANDLERS
  // ============================================

  async handlePaymentCreated(data) {
    const { paymentId } = data;
    const notificationService = require('./notificationService');
    const { PaymentRequest } = require('../models');

    try {
      const payment = await PaymentRequest.findByPk(paymentId);
      if (!payment) return;

      await notificationService.notifyPaymentCreated(payment);
    } catch (err) {
      console.error('Error handling payment:created:', err);
    }
  }

  async handlePaymentApproved(data) {
    const { paymentId } = data;
    const { PaymentRequest, Dealer } = require('../models');

    try {
      const payment = await PaymentRequest.findByPk(paymentId);
      if (!payment) return;

      // Update dealer outstanding amount
      const dealer = await Dealer.findByPk(payment.dealerId);
      if (dealer) {
        const newOutstanding = Math.max(0, (dealer.outstandingAmount || 0) - (payment.amount || 0));
        await dealer.update({ outstandingAmount: newOutstanding });
      }

      // Notify dealer
      const notificationService = require('./notificationService');
      await notificationService.notifyPaymentApproved(payment);
    } catch (err) {
      console.error('Error handling payment:approved:', err);
    }
  }

  // ============================================
  // WORKFLOW EVENT HANDLERS
  // ============================================

  async handleStageTransition(data) {
    const { entityType, entityId, fromStage, toStage } = data;
    const notificationService = require('./notificationService');

    try {
      // Create task for next stage approvers
      const taskService = require('./taskService');
      await taskService.createWorkflowTask(entityType, entityId, toStage);
    } catch (err) {
      console.error('Error handling workflow:stage_transition:', err);
    }
  }

  async handleWorkflowApproved(data) {
    const { entityType, entityId } = data;
    const taskService = require('./taskService');

    try {
      // Mark related tasks as completed
      await taskService.completeWorkflowTasks(entityType, entityId);
    } catch (err) {
      console.error('Error handling workflow:approved:', err);
    }
  }

  async handleWorkflowRejected(data) {
    const { entityType, entityId } = data;
    const taskService = require('./taskService');

    try {
      // Mark related tasks as cancelled
      await taskService.cancelWorkflowTasks(entityType, entityId);
    } catch (err) {
      console.error('Error handling workflow:rejected:', err);
    }
  }

  async handleWorkflowEscalated(data) {
    const { entityType, entityId, stage } = data;
    const notificationService = require('./notificationService');

    try {
      // Notify managers about escalation
      await notificationService.notifyWorkflowEscalation(entityType, entityId, stage);
    } catch (err) {
      console.error('Error handling workflow:escalated:', err);
    }
  }

  // ============================================
  // INVENTORY EVENT HANDLERS
  // ============================================

  async handleLowStock(data) {
    const { materialId, currentStock, threshold } = data;
    const notificationService = require('./notificationService');
    const { Material } = require('../models');

    try {
      const material = await Material.findByPk(materialId);
      if (!material) return;

      // Notify inventory managers
      await notificationService.notifyLowStock(material, currentStock, threshold);
    } catch (err) {
      console.error('Error handling inventory:low_stock:', err);
    }
  }

  async handleReorderThreshold(data) {
    const { materialId } = data;
    const taskService = require('./taskService');

    try {
      // Create reorder task
      await taskService.createReorderTask(materialId);
    } catch (err) {
      console.error('Error handling inventory:reorder_threshold:', err);
    }
  }
}

// Export singleton instance
const eventBus = new EventBus();
module.exports = eventBus;

