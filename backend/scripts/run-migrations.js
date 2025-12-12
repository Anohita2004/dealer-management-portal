// scripts/run-migrations.js
// Run workflow engine migrations

const { sequelize } = require('../src/config/database');
const path = require('path');
const fs = require('fs');

async function runMigrations() {
  try {
    console.log('🔄 Starting workflow engine migrations...\n');

    // Migration 1: Create WorkflowTimeline table
    console.log('📝 Running migration: Create WorkflowTimeline table...');
    const migration1 = require('../src/migrations/20251212000001-create-workflow-timeline');
    await migration1.up(sequelize.getQueryInterface(), sequelize.constructor);
    console.log('✅ WorkflowTimeline table created\n');

    // Migration 2: Add currentSlaExpiresAt to all entities
    console.log('📝 Running migration: Add currentSlaExpiresAt fields...');
    const migration2 = require('../src/migrations/20251212000002-add-current-sla-expires-at');
    await migration2.up(sequelize.getQueryInterface(), sequelize.constructor);
    console.log('✅ currentSlaExpiresAt fields added\n');

    console.log('✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };

