// Migration: Create trucks table
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('trucks', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      truckName: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      licenseNumber: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      truckType: {
        type: Sequelize.ENUM('small', 'medium', 'large'),
        defaultValue: 'medium',
      },
      capacity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Capacity in tons/units',
      },
      status: {
        type: Sequelize.ENUM('available', 'assigned', 'in_transit', 'maintenance', 'inactive'),
        defaultValue: 'available',
      },
      currentLat: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      currentLng: {
        type: Sequelize.DOUBLE,
        allowNull: true,
      },
      lastLocationUpdate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      regionId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'regions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'For scoping trucks by region',
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
    await queryInterface.addIndex('trucks', ['regionId'], {
      name: 'trucks_region_idx',
    });
    await queryInterface.addIndex('trucks', ['status'], {
      name: 'trucks_status_idx',
    });
    await queryInterface.addIndex('trucks', ['isActive'], {
      name: 'trucks_active_idx',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('trucks');
  },
};

