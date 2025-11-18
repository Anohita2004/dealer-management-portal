// src/utils/seedPermissions.js
// Run: node src/utils/seedPermissions.js

const { sequelize, Role, Permission } = require("../models");

const PERMISSIONS = [
  // Dealer Module
  { key: "dealer.view", description: "View dealers" },
  { key: "dealer.create", description: "Create dealers" },
  { key: "dealer.update", description: "Update dealers" },
  { key: "dealer.delete", description: "Delete dealers" },

  // Documents
  { key: "document.upload", description: "Upload documents" },
  { key: "document.verify", description: "Verify documents" },
  { key: "document.approve", description: "Approve documents" },

  // Pricing
  { key: "pricing.view", description: "View pricing" },
  { key: "pricing.request", description: "Request pricing change" },
  { key: "pricing.approve", description: "Approve pricing" },

  // Users / Roles / Permissions
  { key: "users.view", description: "View user list" },
  { key: "users.edit", description: "Edit user" },
  { key: "users.suspend", description: "Suspend user" },

  { key: "roles.view", description: "View roles" },
  { key: "roles.create", description: "Create roles" },
  { key: "roles.delete", description: "Delete roles" },
  { key: "roles.assign.permissions", description: "Assign permissions to roles" },

  { key: "permissions.view", description: "View permissions" },
  { key: "permissions.assign", description: "Assign permissions (matrix) to roles" },

  // Dashboard access
  { key: "dashboard.view.superadmin", description: "View superadmin dashboard" },
  { key: "dashboard.view.manager", description: "View manager dashboard" },

  // Other
  { key: "invoices.view", description: "View invoices" },
  { key: "invoices.create", description: "Create invoices" },
];

const ROLES = [
  "super_admin",
  "technical_admin",
  "regional_admin",
  "regional_manager",
  "area_manager",
  "territory_manager",
  "finance_admin",
  "dealer_admin",
  "dealer_staff",
  "inventory_user",
  "accounts_user",
];

const ROLE_TO_PERMS = {
  super_admin: PERMISSIONS.map((p) => p.key), // all permissions
  technical_admin: [
    "permissions.view",
    "permissions.assign",
    "roles.view",
    "roles.assign.permissions",
    "users.view", // maybe they want to view users for audit
  ],
  regional_admin: [
    "dealer.view",
    "dealer.update",
    "document.verify",
    "roles.view",
  ],
  regional_manager: ["dashboard.view.manager", "dealer.view"],
  finance_admin: ["invoices.view", "invoices.create", "pricing.view", "pricing.approve"],
  dealer_admin: ["dealer.view", "document.upload", "document.verify"],
  dealer_staff: ["dealer.view", "document.upload"],
  inventory_user: ["dealer.view", "pricing.view"],
  accounts_user: ["invoices.view", "dashboard.view.manager"],
};

async function seed() {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connection OK");

    // Create permissions
    const createdPermissions = {};
    for (const p of PERMISSIONS) {
      const [perm] = await Permission.findOrCreate({
        where: { key: p.key },
        defaults: { description: p.description },
      });
      createdPermissions[perm.key] = perm;
    }
    console.log(`Created/Found ${Object.keys(createdPermissions).length} permissions`);

    // Create roles
    const createdRoles = {};
    for (const roleName of ROLES) {
      const [role] = await Role.findOrCreate({
        where: { name: roleName },
      });
      createdRoles[role.name] = role;
    }
    console.log(`Created/Found ${Object.keys(createdRoles).length} roles`);

    // Assign permissions
    for (const [roleName, permKeys] of Object.entries(ROLE_TO_PERMS)) {
      const role = createdRoles[roleName];
      if (!role) {
        console.warn(`Role ${roleName} not found, skipping mapping`);
        continue;
      }

      // Map permission keys to ids
      const permIds = permKeys
        .map((k) => createdPermissions[k])
        .filter(Boolean)
        .map((p) => p.id);

      // setPermissions replaces current permissions with new ones
      await role.setPermissions(permIds);
      console.log(`Mapped ${permIds.length} perms -> ${roleName}`);
    }

    // For super_admin ensure it has ALL permissions
    if (createdRoles.super_admin) {
      const allIds = Object.values(createdPermissions).map((p) => p.id);
      await createdRoles.super_admin.setPermissions(allIds);
      console.log(`Granted all permissions to super_admin`);
    }

    console.log("✅ Seeding finished");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
