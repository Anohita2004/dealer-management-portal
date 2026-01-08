// Migration: Add truckAssignmentId to orders table
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const safeAdd = async (table, column, props) => {
      try {
        await queryInterface.addColumn(table, column, props);
      } catch (e) {
        console.log(`⚠️ Skipping existing column ${table}.${column}`);
      }
    };

    await safeAdd('orders', 'truckAssignmentId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'truck_assignments',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Quick lookup for truck assignment',
    });

    // Create index for faster lookups
    try {
      await queryInterface.addIndex('orders', ['truckAssignmentId'], {
        name: 'orders_truck_assignment_idx',
      });
    } catch (e) {
      console.log('⚠️ Index may already exist');
    }
  },

  down: async (queryInterface, Sequelize) => {
    const safeRemove = async (table, column) => {
      try {
        await queryInterface.removeColumn(table, column);
      } catch (e) {
        console.log(`⚠️ Skipping missing column ${table}.${column}`);
      }
    };

    try {
      await queryInterface.removeIndex('orders', 'orders_truck_assignment_idx');
    } catch (e) {
      console.log('⚠️ Index may not exist');
    }

    await safeRemove('orders', 'truckAssignmentId');
  },
};

