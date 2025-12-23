// scripts/create-test-users.js
// Create controlled test users for each core role with a known password.
// Run with: node scripts/create-test-users.js

require("dotenv").config();

const { sequelize, User, Role, Region, Area, Territory } = require("../src/models");

const TEST_PASSWORD = "Test@123";

async function upsertUser({ username, email, roleName, regionId = null, areaId = null, territoryId = null, dealerId = null }) {
  const t = await sequelize.transaction();
  try {
    const role = await Role.findOne({ where: { name: roleName }, transaction: t });
    if (!role) {
      console.log(`⚠️  Role ${roleName} not found, skipping user ${username}`);
      await t.rollback();
      return null;
    }

    let user = await User.findOne({ where: { username }, transaction: t });

    if (user) {
      await user.update(
        {
          email,
          password: TEST_PASSWORD,
          roleId: role.id,
          role: role.name,
          regionId,
          areaId,
          territoryId,
          dealerId,
          isActive: true,
          isBlocked: false,
        },
        { transaction: t }
      );
      console.log(`✅ Updated test user: ${username} (${roleName})`);
    } else {
      user = await User.create(
        {
          username,
          email,
          password: TEST_PASSWORD,
          roleId: role.id,
          role: role.name,
          regionId,
          areaId,
          territoryId,
          dealerId,
          isActive: true,
          isBlocked: false,
        },
        { transaction: t }
      );
      console.log(`✅ Created test user: ${username} (${roleName})`);
    }

    await t.commit();
    return user;
  } catch (err) {
    await t.rollback();
    console.error(`❌ Failed to upsert user ${username}:`, err.message);
    return null;
  }
}

async function main() {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected");

    // Pick some hierarchy records if available
    const [region] = await Region.findAll({ limit: 1 });
    const [area] = await Area.findAll({ limit: 1 });
    const [territory] = await Territory.findAll({ limit: 1 });

    const regionId = region?.id || null;
    const areaId = area?.id || null;
    const territoryId = territory?.id || null;

    console.log("Using hierarchy for test users:", { regionId, areaId, territoryId });

    const specs = [
      { username: "test_super_admin", email: "test_super_admin@example.com", roleName: "super_admin" },
      { username: "test_technical_admin", email: "test_technical_admin@example.com", roleName: "technical_admin" },
      { username: "test_regional_admin", email: "test_regional_admin@example.com", roleName: "regional_admin", regionId },
      { username: "test_regional_manager", email: "test_regional_manager@example.com", roleName: "regional_manager", regionId },
      { username: "test_area_manager", email: "test_area_manager@example.com", roleName: "area_manager", regionId, areaId },
      { username: "test_territory_manager", email: "test_territory_manager@example.com", roleName: "territory_manager", regionId, areaId, territoryId },
      { username: "test_dealer_admin", email: "test_dealer_admin@example.com", roleName: "dealer_admin" },
      { username: "test_dealer_staff", email: "test_dealer_staff@example.com", roleName: "dealer_staff" },
      { username: "test_finance_admin", email: "test_finance_admin@example.com", roleName: "finance_admin" },
      { username: "test_accounts_user", email: "test_accounts_user@example.com", roleName: "accounts_user" },
      { username: "test_inventory_user", email: "test_inventory_user@example.com", roleName: "inventory_user" },
    ];

    for (const spec of specs) {
      await upsertUser(spec);
    }

    console.log("\n✅ Test users ready. Common password:", TEST_PASSWORD);
    console.log("   Examples:");
    console.log("   - username: test_super_admin");
    console.log("   - username: test_regional_admin");
    console.log("   - username: test_dealer_admin");
  } catch (err) {
    console.error("❌ Error creating test users:", err);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
}


