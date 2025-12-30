// Migration: Create truck_location_history table
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('truck_location_history', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      truckId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'trucks',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      truckAssignmentId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'truck_assignments',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      lat: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
      lng: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
      speed: {
        type: Sequelize.DOUBLE,
        allowNull: true,
        comment: 'Speed in km/h',
      },
      heading: {
        type: Sequelize.DOUBLE,
        allowNull: true,
        comment: 'Heading in degrees (0-360)',
      },
      timestamp: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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

    // Create indexes for efficient queries
    await queryInterface.addIndex('truck_location_history', ['truckId', 'timestamp'], {
      name: 'truck_location_history_truck_timestamp_idx',
    });
    await queryInterface.addIndex('truck_location_history', ['truckAssignmentId'], {
      name: 'truck_location_history_assignment_idx',
    });
    await queryInterface.addIndex('truck_location_history', ['timestamp'], {
      name: 'truck_location_history_timestamp_idx',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('truck_location_history');
  },
};

