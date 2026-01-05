// scripts/run-truck-assignment-migration.js
// Run truck assignment migration to add truckAssignmentId column to orders table

const { sequelize } = require('../src/config/database');

async function runMigration() {
  try {
    console.log('🔄 Starting truck assignment migration...\n');

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Run migration
    console.log('📝 Running migration: Add truckAssignmentId to orders table...');
    const migration = require('../src/migrations/20250101000006-add-order-truck-assignment-fk');
    await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
    console.log('✅ truckAssignmentId column added successfully\n');

    console.log('✅ Migration completed successfully!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    if (error.original) {
      console.error('Original error:', error.original.message);
    }
    await sequelize.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigration()
    .catch((error) => {
      console.error('❌ Unhandled error:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };

