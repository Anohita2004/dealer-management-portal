// Migration: Add GPS tracking fields to truck_assignments table
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

    // Add new fields for GPS tracking
    await safeAdd('truck_assignments', 'startLocationLat', {
      type: Sequelize.DOUBLE,
      allowNull: true,
      comment: "Driver's start location latitude when tracking begins",
    });

    await safeAdd('truck_assignments', 'startLocationLng', {
      type: Sequelize.DOUBLE,
      allowNull: true,
      comment: "Driver's start location longitude when tracking begins",
    });

    await safeAdd('truck_assignments', 'startTrackingAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when GPS tracking started',
    });

    await safeAdd('truck_assignments', 'warehouseArrivedAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when truck arrived at warehouse (geofencing detected)',
    });

    await safeAdd('truck_assignments', 'currentEta', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Real-time ETA to dealer location (updated dynamically)',
    });

    // Update status enum to include 'en_route_to_warehouse'
    // Note: PostgreSQL enum updates require special handling
    try {
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_truck_assignments_status" 
        ADD VALUE IF NOT EXISTS 'en_route_to_warehouse';
      `);
    } catch (e) {
      console.log('⚠️ Status enum update may have failed or already exists:', e.message);
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

    await safeRemove('truck_assignments', 'currentEta');
    await safeRemove('truck_assignments', 'warehouseArrivedAt');
    await safeRemove('truck_assignments', 'startTrackingAt');
    await safeRemove('truck_assignments', 'startLocationLng');
    await safeRemove('truck_assignments', 'startLocationLat');

    // Note: PostgreSQL enum values cannot be easily removed, so we leave the enum as is
  },
};

