'use strict';

// One-off helper to run only the dealers approval-fields migration, bypassing
// the full workflow migration runner (which may hit existing indexes).
//
// Run with:
//   node scripts/run-dealer-approval-migration.js

require('dotenv').config();

const { sequelize } = require('../src/models');
const migration = require('../src/migrations/20251222093010-add-approval-fields-to-dealers');

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected');

    const queryInterface = sequelize.getQueryInterface();
    const Sequelize = require('sequelize');

    console.log('🔄 Running dealers approval-fields migration (status, approvalStage, etc.)...');
    await migration.up(queryInterface, Sequelize);
    console.log('✅ dealers approval-fields migration completed');
  } catch (err) {
    console.error('❌ Error running dealers approval-fields migration:', err);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}


