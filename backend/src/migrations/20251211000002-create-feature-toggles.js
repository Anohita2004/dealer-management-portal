'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('feature_toggles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      key: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      config: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Seed default feature toggles using raw SQL for JSONB
    const { v4: uuidv4 } = require('uuid');
    const now = new Date();
    await queryInterface.sequelize.query(`
      INSERT INTO feature_toggles (id, key, name, description, "isEnabled", config, "createdAt", "updatedAt")
      VALUES
        ('${uuidv4()}', 'pricing_approvals', 'Pricing Approvals', 'Enable/disable pricing approval workflow', true, '{}', '${now.toISOString()}', '${now.toISOString()}'),
        ('${uuidv4()}', 'order_flow', 'Order Flow', 'Enable/disable order processing workflow', true, '{}', '${now.toISOString()}', '${now.toISOString()}'),
        ('${uuidv4()}', 'campaigns', 'Campaigns', 'Enable/disable campaign management', true, '{}', '${now.toISOString()}', '${now.toISOString()}'),
        ('${uuidv4()}', 'manager_hierarchy', 'Manager Hierarchy', 'Enable/disable manager hierarchy features', true, '{}', '${now.toISOString()}', '${now.toISOString()}'),
        ('${uuidv4()}', 'geo_location_validation', 'Geo Location Validation', 'Enable/disable geo-location dealer validation', true, '{}', '${now.toISOString()}', '${now.toISOString()}'),
        ('${uuidv4()}', 'inventory_auto_adjust', 'Inventory Auto Adjustment', 'Enable/disable automatic inventory adjustments', true, '{}', '${now.toISOString()}', '${now.toISOString()}')
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('feature_toggles');
  }
};

