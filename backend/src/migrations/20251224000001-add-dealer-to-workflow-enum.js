'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add 'dealer' to the existing enum type
        // Note: 'ALTER TYPE ... ADD VALUE' cannot be run inside a transaction block in older Postgres,
        // but works in valid transactions in Postgres 12+.
        // To be safe, we can try running it directly.
        return queryInterface.sequelize.query(`
      ALTER TYPE "enum_workflow_timelines_entityType" ADD VALUE 'dealer';
    `);
    },

    down: async (queryInterface, Sequelize) => {
        // Reverting enum values is not simple in Postgres (requires dropping and recreating type).
        // We will skip reversion to avoid data loss.
        return Promise.resolve();
    }
};
