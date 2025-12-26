// scripts/test-user-management-flow.js
// Logs in with controlled test users for each role and exercises /api/admin/users
// to verify which roles can manage users and that scoping behaves as expected.
//
// Run with: node scripts/test-user-management-flow.js

require("dotenv").config();

const axios = require("axios");

const BASE_URL = process.env.API_URL || "http://localhost:3000/api";
const PASSWORD = "Test@123";

const ROLES_TO_TEST = [
  "test_super_admin",
  "test_technical_admin",
  "test_regional_admin",
  "test_regional_manager",
  "test_area_manager",
  "test_territory_manager",
  "test_dealer_admin",
  "test_dealer_staff",
  "test_finance_admin",
  "test_accounts_user",
  "test_inventory_user",
];

async function login(username) {
  try {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      username,
      password: PASSWORD,
    });
    return { ok: true, token: res.data.token, user: res.data.user || null };
  } catch (err) {
    return {
      ok: false,
      error: err.response?.data || err.message,
      status: err.response?.status || 500,
    };
  }
}

async function getUsers(token) {
  try {
    const res = await axios.get(`${BASE_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return {
      ok: true,
      status: res.status,
      total: res.data.total,
      sampleCount: res.data.users?.length || 0,
    };
  } catch (err) {
    return {
      ok: false,
      status: err.response?.status || 500,
      error: err.response?.data || err.message,
    };
  }
}

async function main() {
  console.log("🧪 User Management Flow Test");
  console.log("Base URL:", BASE_URL);
  console.log("Roles under test:", ROLES_TO_TEST.join(", "));
  console.log("Password:", PASSWORD);
  console.log("=".repeat(60));

  const results = [];

  for (const username of ROLES_TO_TEST) {
    console.log(`\n--- Testing role via user: ${username} ---`);

    const loginRes = await login(username);
    if (!loginRes.ok) {
      console.log("  ❌ Login failed:", loginRes.status, loginRes.error);
      results.push({ username, canListUsers: false, loginOk: false, status: loginRes.status });
      continue;
    }

    console.log("  ✅ Login ok");

    const listRes = await getUsers(loginRes.token);
    if (listRes.ok) {
      console.log(
        `  ✅ GET /admin/users -> ${listRes.status}, total=${listRes.total}, sample=${listRes.sampleCount}`
      );
      results.push({ username, canListUsers: true, loginOk: true, status: listRes.status });
    } else {
      console.log(`  ⚠️  GET /admin/users denied -> ${listRes.status}`, listRes.error);
      results.push({ username, canListUsers: false, loginOk: true, status: listRes.status });
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  for (const r of results) {
    console.log(
      `${r.username.padEnd(22)} | login=${r.loginOk ? "✅" : "❌"} | canListUsers=${
        r.canListUsers ? "✅" : "❌"
      } | lastStatus=${r.status}`
    );
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


