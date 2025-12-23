'use strict';

/**
 * Helper script to ensure new RBAC / material mapping tables exist:
 * - user_dealers
 * - dealer_materials
 * - region_materials
 *
 * Run: node src/utils/runSalesRoleMigrations.js
 */

const { sequelize } = require('../config/database');
const migrationUserDealers = require('../migrations/20251222090000-create-user-dealers');
const migrationDealerMaterials = require('../migrations/20251222091000-create-dealer-materials');
const migrationRegionMaterials = require('../migrations/20251222092000-create-region-materials');

async function run() {
  const qi = sequelize.getQueryInterface();
  const SequelizeLib = sequelize.constructor;

  try {
    console.log('🔄 Ensuring user_dealers table exists...');
    await migrationUserDealers.up(qi, SequelizeLib);
    console.log('✅ user_dealers migration applied');
  } catch (err) {
    if (err && /user_dealers/i.test(String(err)) && /exists/i.test(String(err))) {
      console.log('ℹ️ user_dealers already exists, skipping');
    } else {
      console.error('❌ Error applying user_dealers migration:', err);
    }
  }

  try {
    console.log('🔄 Ensuring dealer_materials table exists...');
    await migrationDealerMaterials.up(qi, SequelizeLib);
    console.log('✅ dealer_materials migration applied');
  } catch (err) {
    if (err && /dealer_materials/i.test(String(err)) && /exists/i.test(String(err))) {
      console.log('ℹ️ dealer_materials already exists, skipping');
    } else {
      console.error('❌ Error applying dealer_materials migration:', err);
    }
  }

  try {
    console.log('🔄 Ensuring region_materials table exists...');
    await migrationRegionMaterials.up(qi, SequelizeLib);
    console.log('✅ region_materials migration applied');
  } catch (err) {
    if (err && /region_materials/i.test(String(err)) && /exists/i.test(String(err))) {
      console.log('ℹ️ region_materials already exists, skipping');
    } else {
      console.error('❌ Error applying region_materials migration:', err);
    }
  }

  await sequelize.close();
}

if (require.main === module) {
  run()
    .then(() => {
      console.log('✅ Sales role-related migrations completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Failed to run sales role migrations:', err);
      process.exit(1);
    });
}

module.exports = { run };


