const { sequelize } = require('../src/config/database');
const path = require('path');
const fs = require('fs');
const migration = require('../src/migrations/20260119113000-create-delivery-order-tables.js');

async function runDeliveryOrderMigration() {
    try {
        console.log('🔄 Starting Delivery Order migration...');

        // Test connection first
        await sequelize.authenticate();
        console.log('✅ DB Connection Verified.');

        const queryInterface = sequelize.getQueryInterface();

        console.log('📝 Running up() for 20260119113000-create-delivery-order-tables.js');
        await migration.up(queryInterface, sequelize.constructor);

        console.log('✅ Delivery Order tables created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run it
runDeliveryOrderMigration();
