// scripts/run-gps-tracking-migration.js
// Run GPS tracking migration

const { sequelize } = require('../src/config/database');

async function runMigration() {
  try {
    console.log('🔄 Starting GPS tracking migration...\n');

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Run migration
    console.log('📝 Running migration: Add GPS tracking fields to truck_assignments...');
    const migration = require('../src/migrations/20250101000007-add-gps-tracking-fields-to-truck-assignments');
    await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
    console.log('✅ GPS tracking fields added successfully\n');

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

