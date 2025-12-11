'use strict';

/**
 * Backfill script to normalize legacy user roles into canonical Role records
 * and attach roleId. Run once after seeding roles/permissions:
 *   node src/utils/backfillRolesAndScopes.js
 */

const { sequelize, User, Role } = require('../models');

// Map legacy enum/labels to canonical role names
const LEGACY_TO_CANON = {
  admin: 'super_admin',
  key_user: 'technical_admin',
  tm: 'territory_manager',
  am: 'area_manager',
  sm: 'regional_manager',
  dealer: 'dealer_admin',
  accounts: 'accounts_user',
  inventory: 'inventory_user',
};

async function main() {
  await sequelize.authenticate();
  console.log('✅ DB connected');

  // Build roleName -> role record map
  const roles = await Role.findAll();
  const roleMap = Object.fromEntries(roles.map((r) => [r.name, r]));

  const users = await User.findAll();
  let updated = 0;

  for (const user of users) {
    const legacy = user.role;
    const canonical = user.roleId
      ? null
      : user.roleDetails?.name || LEGACY_TO_CANON[legacy] || legacy;

    if (!canonical) continue;

    const role = roleMap[canonical];
    if (!role) {
      console.warn(`⚠️ Missing Role record for ${canonical}, skipping user ${user.id}`);
      continue;
    }

    user.roleId = role.id;
    await user.save({ fields: ['roleId'] });
    updated++;
  }

  console.log(`✅ Backfill complete. Users updated: ${updated}/${users.length}`);
  await sequelize.close();
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Backfill error:', err);
      process.exit(1);
    });
}

module.exports = { main };

