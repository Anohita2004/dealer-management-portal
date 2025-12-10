// src/utils/seedPermissions.js
// Run: node src/utils/seedPermissions.js

const { sequelize, Role, Permission } = require("../models");

const PERMISSIONS = [
  // ===== USER MANAGEMENT =====
  { key: "users.view", description: "View user list" },
  { key: "users.create", description: "Create users" },
  { key: "users.edit", description: "Edit user" },
  { key: "users.suspend", description: "Suspend user" },

  { key: "roles.view", description: "View roles" },
  { key: "roles.create", description: "Create roles" },
  { key: "roles.delete", description: "Delete roles" },
  { key: "roles.assign.permissions", description: "Assign permissions to roles" },

  { key: "permissions.view", description: "View permissions" },
  { key: "permissions.assign", description: "Assign permissions to roles" },

  // ===== DEALER MANAGEMENT =====
  { key: "dealer.view", description: "View dealers" },
  { key: "dealer.create", description: "Create dealers" },
  { key: "dealer.update", description: "Update dealers" },
  { key: "dealer.delete", description: "Delete dealers" },

  // ===== GEOGRAPHICAL MANAGEMENT =====
  { key: "regions.view", description: "View regions" },
  { key: "regions.manage", description: "Manage regions" },
  { key: "areas.view", description: "View areas" },
  { key: "areas.manage", description: "Manage areas" },
  { key: "territories.view", description: "View territories" },
  { key: "territories.manage", description: "Manage territories" },

  // ===== ORDERS & APPROVALS =====
  { key: "orders.view", description: "View orders" },
  { key: "orders.create", description: "Create orders" },
  { key: "orders.approve", description: "Approve orders" },
  { key: "orders.reject", description: "Reject orders" },
  { key: "orders.edit", description: "Edit orders" },

  // ===== INVOICES =====
  { key: "invoices.view", description: "View invoices" },
  { key: "invoices.create", description: "Create invoices" },
  { key: "invoices.edit", description: "Edit invoices" },

  // ===== PAYMENTS =====
  { key: "payments.view", description: "View payments" },
  { key: "payments.create", description: "Create payments" },
  { key: "payments.approve", description: "Approve payments" },
  { key: "payments.edit", description: "Edit payments" },

  // ===== INVENTORY =====
  { key: "inventory.view", description: "View inventory" },
  { key: "inventory.manage", description: "Manage inventory" },
  { key: "inventory.adjust", description: "Adjust inventory levels" },

  // ===== DOCUMENTS =====
  { key: "documents.upload", description: "Upload documents" },
  { key: "documents.view", description: "View documents" },
  { key: "documents.verify", description: "Verify documents" },
  { key: "documents.approve", description: "Approve documents" },

  // ===== PRICING =====
  { key: "pricing.view", description: "View pricing" },
  { key: "pricing.request", description: "Request pricing change" },
  { key: "pricing.approve", description: "Approve pricing" },
  { key: "pricing.manage", description: "Manage pricing" },

  // ===== CAMPAIGNS =====
  { key: "campaigns.view", description: "View campaigns" },
  { key: "campaigns.create", description: "Create campaigns" },
  { key: "campaigns.edit", description: "Edit campaigns" },
  { key: "campaigns.delete", description: "Delete campaigns" },
  { key: "campaigns.approve", description: "Approve campaigns" },

  // ===== MAPS =====
  { key: "maps.view", description: "View maps" },
  { key: "maps.heatmap", description: "View heatmaps" },
  { key: "maps.regions", description: "View regional data on maps" },
  { key: "maps.global", description: "View global map data" },

  // ===== REPORTS =====
  { key: "reports.view", description: "View reports" },
  { key: "reports.create", description: "Create custom reports" },
  { key: "reports.export", description: "Export reports" },

  // ===== MESSAGING =====
  { key: "messages.view", description: "View messages" },
  { key: "messages.send", description: "Send messages" },

  // ===== NOTIFICATIONS =====
  { key: "notifications.view", description: "View notifications" },
  { key: "notifications.send", description: "Send notifications" },

  // ===== DASHBOARDS =====
  { key: "dashboard.view.superadmin", description: "View superadmin dashboard" },
  { key: "dashboard.view.regional", description: "View regional dashboard" },
  { key: "dashboard.view.manager", description: "View manager dashboard" },
  { key: "dashboard.view.dealer", description: "View dealer dashboard" },

  // ===== SALES TEAMS =====
  { key: "teams.view", description: "View sales teams" },
  { key: "teams.manage", description: "Manage sales teams" },

  // ===== SYSTEM ADMIN =====
  { key: "system.logs", description: "View system logs" },
  { key: "system.config", description: "Manage system configuration" },
  { key: "system.backup", description: "System backup and restore" },
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
    "permissions.view", "permissions.assign",
    "roles.view", "roles.assign.permissions",
    "users.view", "users.edit",
    "system.logs", "system.config"
  ],

  regional_admin: [
    "dealer.view", "dealer.create", "dealer.update",
    "users.view", "users.create", "users.edit",
    "regions.view", "areas.view", "territories.view",
    "orders.view", "orders.approve",
    "invoices.view", "payments.view", "payments.approve",
    "documents.view", "documents.verify",
    "campaigns.view", "campaigns.create",
    "maps.view", "maps.regions", "maps.heatmap",
    "reports.view", "reports.export",
    "dashboard.view.regional"
  ],

  regional_manager: [
    "dealer.view", "dealer.update",
    "users.view", "areas.view", "territories.view",
    "orders.view", "orders.approve", "orders.reject",
    "invoices.view", "payments.view",
    "documents.view", "documents.verify",
    "campaigns.view",
    "maps.view", "maps.regions", "maps.heatmap",
    "dashboard.view.manager",
    "teams.view"
  ],

  area_manager: [
    "dealer.view", "dealer.update",
    "orders.view", "orders.approve", "orders.reject",
    "invoices.view", "payments.view", "payments.approve",
    "documents.view", "documents.verify",
    "pricing.view", "pricing.approve",
    "campaigns.view",
    "maps.view", "maps.heatmap",
    "dashboard.view.manager"
  ],

  territory_manager: [
    "dealer.view", "dealer.update",
    "orders.view", "orders.approve", "orders.reject",
    "invoices.view", "payments.view",
    "documents.view", "documents.verify",
    "campaigns.view",
    "maps.view", "maps.heatmap",
    "dashboard.view.manager"
  ],

  finance_admin: [
    "invoices.view", "invoices.create", "invoices.edit",
    "payments.view", "payments.create", "payments.edit", "payments.approve",
    "pricing.view", "pricing.manage",
    "reports.view", "reports.export"
  ],

  dealer_admin: [
    "dealer.view", // only their own dealer
    "users.create", "users.edit", // manage staff
    "orders.create", "orders.view",
    "invoices.view", "payments.create", "payments.view",
    "documents.upload", "documents.view", "documents.verify",
    "maps.view",
    "dashboard.view.dealer"
  ],

  dealer_staff: [
    "orders.create", "orders.view",
    "invoices.view", "payments.create", "payments.view",
    "documents.upload", "documents.view",
    "maps.view",
    "dashboard.view.dealer"
  ],

  inventory_user: [
    "inventory.view", "inventory.manage", "inventory.adjust",
    "pricing.view"
  ],

  accounts_user: [
    "invoices.view", "invoices.edit",
    "payments.view", "payments.edit"
  ]
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
