const { sequelize } = require('../src/config/database');
const fs = require('fs');
const migration = require('../src/migrations/20260119120000-create-physical-inventory.js');

async function runInventoryMigration() {
    try {
        console.log('🔄 Starting Physical Inventory migration...');
        await sequelize.authenticate();
        console.log('✅ DB Connection Verified.');

        const queryInterface = sequelize.getQueryInterface();
        await migration.up(queryInterface, sequelize.constructor);

        console.log('✅ Physical Inventory tables created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runInventoryMigration();
