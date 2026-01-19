const { sequelize } = require('../src/config/database');
const fs = require('fs');
const migration = require('../src/migrations/20260119123000-create-insurance-claims.js');

async function runClaimMigration() {
    try {
        console.log('🔄 Starting Insurance Claims migration...');
        await sequelize.authenticate();
        console.log('✅ DB Connection Verified.');

        const queryInterface = sequelize.getQueryInterface();
        await migration.up(queryInterface, sequelize.constructor);

        console.log('✅ Insurance Claim table created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runClaimMigration();
