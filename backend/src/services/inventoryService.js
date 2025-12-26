// src/services/inventoryService.js
// Inventory Automation Service - Auto stock reduction, alerts, regional filtering, reorder thresholds

const { Inventory, Material, Order, OrderItem, Invoice, InvoiceItem, Dealer, Region, Area, Territory } = require('../models');
const { Op } = require('sequelize');
const eventBus = require('./eventBus');
const notificationService = require('./notificationService');
const RBACEngine = require('./rbacEngine');

/**
 * Inventory Service - Handles inventory automation and management
 */
class InventoryService {
  /**
   * Auto-reduce stock when order is approved
   * @param {string} orderId - Order ID
   * @param {Object} transaction - Sequelize transaction
   * @returns {Promise<void>}
   */
  async reduceStockOnOrderApproval(orderId, transaction = null) {
    const order = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: 'items' }],
      transaction
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    for (const item of order.items) {
      const material = await Material.findByPk(item.materialId, { transaction });
      if (!material) continue;

      const newStock = Math.max(0, (material.stock || 0) - item.qty);
      await material.update({ stock: newStock }, { transaction });

      // Check for low stock alert
      await this.checkLowStockAlert(material, newStock, transaction);
    }
  }

  /**
   * Auto-reduce stock when invoice is created/approved
   * @param {string} invoiceId - Invoice ID
   * @param {Object} transaction - Sequelize transaction
   * @returns {Promise<void>}
   */
  async reduceStockOnInvoice(invoiceId, transaction = null) {
    // Check if invoice has items (if InvoiceItem model exists)
    // For now, we'll assume invoices reference orders or materials directly
    // This can be extended based on your invoice structure
  }

  /**
   * Check and alert on low stock
   * @param {Object} material - Material object
   * @param {number} currentStock - Current stock level
   * @param {Object} transaction - Sequelize transaction
   * @returns {Promise<void>}
   */
  async checkLowStockAlert(material, currentStock, transaction = null) {
    if (!material.reorderThreshold) return;

    if (currentStock <= material.reorderThreshold) {
      // Emit low stock event
      await eventBus.emit('inventory:low_stock', {
        materialId: material.id,
        materialName: material.name,
        currentStock,
        threshold: material.reorderThreshold
      });

      // Create notification
      await notificationService.notifyLowStock(material, currentStock, material.reorderThreshold);

      // If stock is critically low (below 50% of threshold), create reorder task
      if (currentStock <= material.reorderThreshold * 0.5) {
        await eventBus.emit('inventory:reorder_threshold', {
          materialId: material.id,
          materialName: material.name,
          currentStock,
          threshold: material.reorderThreshold
        });
      }
    }
  }

  /**
   * Get inventory filtered by region/area/territory based on user scope
   * @param {Object} user - User object
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Filtered inventory items
   */
  async getScopedInventory(user, options = {}) {
    const { regionId, areaId, territoryId, dealerId, lowStockOnly } = options;
    const scope = RBACEngine.getUserScope(user);

    // Build where clause based on scope
    const whereClause = {};

    // If user has specific scope, filter by dealer's hierarchy
    if (scope.dealerId) {
      whereClause.dealerId = scope.dealerId;
    } else if (scope.territoryId) {
      // Get all dealers in territory
      const dealers = await Dealer.findAll({
        where: { territoryId: scope.territoryId },
        attributes: ['id']
      });
      whereClause.dealerId = { [Op.in]: dealers.map(d => d.id) };
    } else if (scope.areaId) {
      const dealers = await Dealer.findAll({
        where: { areaId: scope.areaId },
        attributes: ['id']
      });
      whereClause.dealerId = { [Op.in]: dealers.map(d => d.id) };
    } else if (scope.regionId) {
      const dealers = await Dealer.findAll({
        where: { regionId: scope.regionId },
        attributes: ['id']
      });
      whereClause.dealerId = { [Op.in]: dealers.map(d => d.id) };
    }

    // Apply additional filters
    if (regionId) {
      const dealers = await Dealer.findAll({
        where: { regionId },
        attributes: ['id']
      });
      whereClause.dealerId = { [Op.in]: dealers.map(d => d.id) };
    }
    if (areaId) {
      const dealers = await Dealer.findAll({
        where: { areaId },
        attributes: ['id']
      });
      whereClause.dealerId = { [Op.in]: dealers.map(d => d.id) };
    }
    if (territoryId) {
      const dealers = await Dealer.findAll({
        where: { territoryId },
        attributes: ['id']
      });
      whereClause.dealerId = { [Op.in]: dealers.map(d => d.id) };
    }
    if (dealerId) {
      whereClause.dealerId = dealerId;
    }

    // Get inventory items
    const inventoryItems = await Inventory.findAll({
      where: whereClause,
      include: [
        { model: Material, as: 'material' },
        { model: Dealer, as: 'dealer' }
      ]
    });

    // Filter by low stock if requested
    if (lowStockOnly) {
      return inventoryItems.filter(item => {
        if (!item.material || !item.material.reorderThreshold) return false;
        return (item.quantity || 0) <= item.material.reorderThreshold;
      });
    }

    return inventoryItems;
  }

  /**
   * Get materials with low stock across scope
   * @param {Object} user - User object
   * @returns {Promise<Array>} Materials with low stock
   */
  async getLowStockMaterials(user) {
    const scope = RBACEngine.getUserScope(user);
    const materials = await Material.findAll({
      where: {
        reorderThreshold: { [Op.ne]: null }
      }
    });

    const lowStockMaterials = [];

    for (const material of materials) {
      const currentStock = material.stock || 0;
      if (currentStock <= material.reorderThreshold) {
        lowStockMaterials.push({
          ...material.toJSON(),
          currentStock,
          threshold: material.reorderThreshold,
          needsReorder: currentStock <= material.reorderThreshold * 0.5
        });
      }
    }

    return lowStockMaterials;
  }

  /**
   * Set reorder threshold for a material
   * @param {string} materialId - Material ID
   * @param {number} threshold - Reorder threshold
   * @returns {Promise<Object>} Updated material
   */
  async setReorderThreshold(materialId, threshold) {
    const material = await Material.findByPk(materialId);
    if (!material) {
      throw new Error(`Material ${materialId} not found`);
    }

    await material.update({ reorderThreshold: threshold });

    // Check if current stock is below new threshold
    await this.checkLowStockAlert(material, material.stock || 0);

    return material;
  }

  /**
   * Get inventory summary by region/area/territory
   * @param {Object} user - User object
   * @returns {Promise<Object>} Inventory summary
   */
  async getInventorySummary(user) {
    const scope = RBACEngine.getUserScope(user);
    const materials = await Material.findAll();

    const summary = {
      totalMaterials: materials.length,
      lowStock: 0,
      outOfStock: 0,
      byRegion: {},
      byArea: {},
      byTerritory: {}
    };

    for (const material of materials) {
      const stock = material.stock || 0;
      if (stock === 0) {
        summary.outOfStock++;
      } else if (material.reorderThreshold && stock <= material.reorderThreshold) {
        summary.lowStock++;
      }
    }

    // Get dealers under scope
    const dealerIds = await RBACEngine.getDealersInScope(user);
    const dealers = await Dealer.findAll({
      where: { id: { [Op.in]: dealerIds } },
      include: [
        { model: Region, as: 'region' },
        { model: Area, as: 'area' },
        { model: Territory, as: 'territoryRelation' }
      ]
    });

    // Aggregate by hierarchy
    dealers.forEach(dealer => {
      if (dealer.regionId) {
        if (!summary.byRegion[dealer.regionId]) {
          summary.byRegion[dealer.regionId] = { name: dealer.region?.name, count: 0 };
        }
        summary.byRegion[dealer.regionId].count++;
      }
      if (dealer.areaId) {
        if (!summary.byArea[dealer.areaId]) {
          summary.byArea[dealer.areaId] = { name: dealer.area?.name, count: 0 };
        }
        summary.byArea[dealer.areaId].count++;
      }
      if (dealer.territoryId) {
        if (!summary.byTerritory[dealer.territoryId]) {
          summary.byTerritory[dealer.territoryId] = { name: dealer.territory?.name, count: 0 };
        }
        summary.byTerritory[dealer.territoryId].count++;
      }
    });

    return summary;
  }

  /**
   * Auto-update inventory when order status changes
   * @param {string} orderId - Order ID
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   * @returns {Promise<void>}
   */
  async handleOrderStatusChange(orderId, oldStatus, newStatus) {
    // If order is being cancelled or rejected, restore stock
    if ((oldStatus === 'Approved' || oldStatus === 'Processing') && 
        (newStatus === 'Cancelled' || newStatus === 'Rejected')) {
      await this.restoreStockFromOrder(orderId);
    }
    // If order is approved, reduce stock
    else if (newStatus === 'Approved' && oldStatus !== 'Approved') {
      await this.reduceStockOnOrderApproval(orderId);
    }
  }

  /**
   * Restore stock from cancelled/rejected order
   * @param {string} orderId - Order ID
   * @param {Object} transaction - Sequelize transaction
   * @returns {Promise<void>}
   */
  async restoreStockFromOrder(orderId, transaction = null) {
    const order = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: 'items' }],
      transaction
    });

    if (!order) return;

    for (const item of order.items) {
      const material = await Material.findByPk(item.materialId, { transaction });
      if (material) {
        const newStock = (material.stock || 0) + item.qty;
        await material.update({ stock: newStock }, { transaction });
      }
    }
  }
}

module.exports = new InventoryService();

