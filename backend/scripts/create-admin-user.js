// scripts/create-admin-user.js
// Quick script to create an admin user for testing
// Run with: node scripts/create-admin-user.js

require("dotenv").config();

const { sequelize, User, Role } = require("../src/models");

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "Admin@123";
const ADMIN_EMAIL = "admin@dealerportal.com";

async function createAdminUser() {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected");

    // Check if user already exists
    const existingUser = await User.findOne({ where: { username: ADMIN_USERNAME } });
    if (existingUser) {
      console.log(`⚠️  User '${ADMIN_USERNAME}' already exists.`);
      console.log("   Updating password and ensuring it's active...");
      
      existingUser.password = ADMIN_PASSWORD;
      existingUser.isActive = true;
      existingUser.isBlocked = false;
      await existingUser.save();
      
      console.log(`✅ Updated user '${ADMIN_USERNAME}'`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
      await sequelize.close();
      return;
    }

    // Try to find super_admin role first, then fall back to admin role
    let role = await Role.findOne({ where: { name: "super_admin" } });
    if (!role) {
      role = await Role.findOne({ where: { name: "admin" } });
    }
    if (!role) {
      // If no roles exist, create user without roleId (legacy mode)
      console.log("⚠️  No roles found. Creating user with legacy role field...");
      const user = await User.create({
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: "admin", // Valid enum value
        isActive: true,
        isBlocked: false,
      });
      console.log(`✅ Created admin user: ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
      await sequelize.close();
      return;
    }

    // Create user with roleId
    // Use "admin" for legacy role enum (not "super_admin")
    const legacyRole = role.name === "super_admin" ? "admin" : role.name;
    const user = await User.create({
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      roleId: role.id,
      role: legacyRole, // Use valid enum value
      isActive: true,
      isBlocked: false,
    });

    console.log(`✅ Created admin user: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${role.name} (ID: ${role.id})`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log("\n📝 You can now login with:");
    console.log(`   Username: ${ADMIN_USERNAME}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
  } catch (err) {
    console.error("❌ Error creating admin user:", err);
    console.error("   Error message:", err.message);
    if (err.stack) {
      console.error("   Stack:", err.stack);
    }
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  createAdminUser()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
}

module.exports = { createAdminUser };

