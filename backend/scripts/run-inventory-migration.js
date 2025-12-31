// scripts/run-inventory-migration.js
// Run inventory fields migration

const { sequelize } = require('../src/config/database');

async function runInventoryMigration() {
  try {
    console.log('🔄 Starting inventory fields migration...\n');

    const migration = require('../src/migrations/20251231000001-add-inventory-fields');
    await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
    console.log('✅ Inventory fields migration completed successfully!\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runInventoryMigration()
    .catch((error) => {
      console.error('❌ Unhandled error in runInventoryMigration:', error);
      process.exit(1);
    });
}

module.exports = { runInventoryMigration };

