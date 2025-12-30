// Migration: Update orders status enum to include "In Transit"
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // For PostgreSQL, we need to alter the enum type
    // First check if we're using PostgreSQL
    const [results] = await queryInterface.sequelize.query(
      "SELECT version();"
    );
    const isPostgres = results && results[0] && results[0].version && results[0].version.includes('PostgreSQL');

    if (isPostgres) {
      // PostgreSQL: Add new value to enum
      await queryInterface.sequelize.query(
        "ALTER TYPE \"enum_orders_status\" ADD VALUE IF NOT EXISTS 'In Transit';"
      );
    } else {
      // For other databases, the enum will be updated when the model is synced
      // This is a no-op for SQLite/MySQL as they handle enums differently
      console.log('Note: Enum update may require manual intervention for non-PostgreSQL databases');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Note: Removing enum values in PostgreSQL is complex and not recommended
    // This migration will not attempt to remove the enum value
    console.log('Note: Enum value removal is not supported. Manual intervention may be required.');
  },
};

