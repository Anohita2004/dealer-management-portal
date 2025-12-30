// Migration: Create truck_assignments table
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('truck_assignments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      orderId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'orders',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      truckId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'trucks',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      warehouseId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'warehouses',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      driverName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      driverPhone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      assignedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      assignedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      status: {
        type: Sequelize.ENUM('assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'),
        defaultValue: 'assigned',
      },
      pickupAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      deliveredAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      estimatedDeliveryAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Create indexes
    await queryInterface.addIndex('truck_assignments', ['orderId'], {
      name: 'truck_assignments_order_idx',
      unique: true,
    });
    await queryInterface.addIndex('truck_assignments', ['truckId'], {
      name: 'truck_assignments_truck_idx',
    });
    await queryInterface.addIndex('truck_assignments', ['warehouseId'], {
      name: 'truck_assignments_warehouse_idx',
    });
    await queryInterface.addIndex('truck_assignments', ['status'], {
      name: 'truck_assignments_status_idx',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('truck_assignments');
  },
};

