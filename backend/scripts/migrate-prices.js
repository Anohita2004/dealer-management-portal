const { sequelize } = require('../src/config/database');
const fs = require('fs');
const migration = require('../src/migrations/20260119130000-add-price-to-materials.js');

async function runPriceMigration() {
    try {
        console.log('🔄 Starting Material Price migration...');
        await sequelize.authenticate();
        console.log('✅ DB Connection Verified.');

        const queryInterface = sequelize.getQueryInterface();
        await migration.up(queryInterface, sequelize.constructor);

        console.log('✅ Price column added and seeded successfully!');
        process.exit(0);
    } catch (error) {
        // Check if error is because column already exists
        if (error.original && error.original.code === '42701') {
            console.log('⚠️ Column "price" already exists. Expanding scope to update prices only..');
            try {
                await sequelize.query(`
                UPDATE materials SET price = 500.00 WHERE "materialNumber" = 'M-1001';
                UPDATE materials SET price = 300.00 WHERE "materialNumber" = 'M-1002';
                UPDATE materials SET price = 150.00 WHERE "materialNumber" = 'M-2001';
            `);
                console.log('✅ Prices seeded successfully!');
                process.exit(0);
            } catch (e) {
                console.error('❌ Failed to update prices:', e);
                process.exit(1);
            }
        }

        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runPriceMigration();
