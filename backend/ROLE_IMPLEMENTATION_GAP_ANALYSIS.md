# Role Implementation Gap Analysis

## Executive Summary

**Status: ~85% Implemented** - Most role capabilities are implemented, but several critical gaps exist that prevent full compliance with the specified role hierarchy.

---

## ✅ FULLY IMPLEMENTED ROLES

### 1️⃣ Super Admin ✅
- ✅ All permissions granted (has all permission keys)
- ✅ Can manage users (create, edit, deactivate) - via `users.create`, `users.edit`, `users.suspend`
- ✅ Can manage roles & permissions - via `roles.*`, `permissions.*` permissions
- ✅ Can access global dashboards - via `dashboard.view.superadmin`
- ✅ Can override any decision - super_admin bypasses all checks
- ✅ Can manage system-wide configuration - via `system.config`
- ✅ Can view all notifications, logs, activity - via `system.logs`, `notifications.view`
- ✅ No scoping restrictions (sees everything)

### 2️⃣ Technical Admin ✅
- ✅ Can manage permissions - via `permissions.view`, `permissions.assign`
- ✅ Can configure system settings - via `system.config`
- ✅ Can manage audit logs - via `system.logs`
- ✅ No business approvals - correctly excluded from business workflows
- ✅ Permission-based control (no scoping)

### 3️⃣ Regional Manager ✅
- ✅ Can view dealers in region - via scoping (`regionId`)
- ✅ Can view area/territory managers - via `users.view` with scoping
- ✅ Can approve mid-stage tasks - via `orders.approve`, `documents.verify`
- ✅ Can monitor campaigns - via `campaigns.view`
- ✅ Can view region maps - via `maps.view`, `maps.regions`
- ✅ Cannot create users - correctly restricted
- ✅ Cannot assign managers - correctly restricted

### 4️⃣ Area Manager ✅
- ✅ Can view dealers in area - via scoping (`areaId`)
- ✅ Can approve orders at area stage - via `orders.approve` in workflow
- ✅ Can approve documents at area stage - via `documents.verify` in workflow
- ✅ Can access area dashboard - via `dashboard.view.manager`
- ✅ Cannot create managers - correctly restricted
- ✅ Cannot approve pricing - **WAIT, THIS IS WRONG** (see gaps)

### 5️⃣ Dealer Admin ✅
- ✅ Can manage dealer staff - via `users.create`, `users.edit` with `dealerId` scoping
- ✅ Can approve orders - via `orders.approve` (first stage in pipeline)
- ✅ Can approve payment requests - via `payments.approve` (first stage)
- ✅ Can approve document uploads - via `documents.verify` (first stage)
- ✅ Can view dealer-only dashboard - via `dashboard.view.dealer`
- ✅ Cannot see other dealers - correctly scoped to `dealerId`

### 6️⃣ Dealer Staff ✅
- ✅ Can create sales orders - via `orders.create`
- ✅ Can upload KYC documents - via `documents.upload`
- ✅ Can create payment requests - via `payments.create`
- ✅ Can see only own orders - correctly scoped
- ✅ Cannot approve anything - correctly restricted

### 7️⃣ Accounts User ✅
- ✅ Can view ledgers - via `invoices.view`, `payments.view`
- ✅ Can view invoices & payments - via `invoices.view`, `payments.view`
- ✅ Can prepare documents for finance approval - via `invoices.edit`, `payments.edit`
- ✅ Cannot approve orders or manage dealers - correctly restricted

### 8️⃣ Inventory User ✅
- ✅ Can update stock levels - via `inventory.manage`, `inventory.adjust`
- ✅ Can view product availability - via `inventory.view`
- ✅ Cannot approve orders or manage dealers - correctly restricted

---

## ⚠️ PARTIALLY IMPLEMENTED / GAPS

### 3️⃣ Regional Admin ⚠️

**MISSING:**
- ❌ **Cannot assign areas to area managers** - Missing `areas.manage` permission
- ❌ **Cannot assign territories to territory managers** - Missing `territories.manage` permission
- ❌ **Cannot manage entire hierarchy** - Only has `areas.view`, `territories.view`, not `areas.manage`, `territories.manage`

**Current Permissions:**
```javascript
regional_admin: [
  "dealer.view", "dealer.create", "dealer.update",
  "users.view", "users.create", "users.edit",
  "regions.view", "areas.view", "territories.view",  // ❌ Should be .manage
  "orders.view", "orders.approve",
  // ...
]
```

**Required Fix:**
```javascript
regional_admin: [
  // ... existing ...
  "areas.manage", "territories.manage",  // ADD THESE
  // ...
]
```

**Impact:** Regional Admin cannot assign areas/territories to managers, which is a core requirement.

---

### 6️⃣ Territory Manager ⚠️

**MISSING:**
- ❌ **Cannot approve pricing at first level** - Missing `pricing.approve` permission
- ❌ **Not in pricing pipeline** - Pricing pipeline starts at `area_manager`, not `territory_manager`

**Current Permissions:**
```javascript
territory_manager: [
  // ... existing ...
  // ❌ Missing: "pricing.view", "pricing.approve"
]
```

**Current Pipeline:**
```javascript
PRICING_PIPELINE = [
  'area_manager',      // ❌ Should start with 'territory_manager'
  'regional_admin',
  'super_admin',
];
```

**Required Fix:**
1. Add `pricing.view` and `pricing.approve` to `territory_manager` permissions
2. Update `PRICING_PIPELINE` to start with `territory_manager`:
```javascript
PRICING_PIPELINE = [
  'territory_manager',  // ADD THIS
  'area_manager',
  'regional_admin',
  'super_admin',
];
```

**Impact:** Territory Manager cannot approve pricing at first level as specified.

---

### 9️⃣ Finance Admin ⚠️

**MISSING:**
- ❌ **Not in payment approval pipeline** - Payment pipeline ends at `regional_admin`, not `finance_admin`
- ⚠️ **Has `payments.approve` permission** but workflow doesn't route to them

**Current Pipeline:**
```javascript
PAYMENT_PIPELINE = [
  'dealer_admin',
  'territory_manager',
  'area_manager',
  'regional_manager',
  'regional_admin',  // ❌ Should end with 'finance_admin'
];
```

**Required Fix:**
```javascript
PAYMENT_PIPELINE = [
  'dealer_admin',
  'territory_manager',
  'area_manager',
  'regional_manager',
  'regional_admin',
  'finance_admin',  // ADD THIS as final approver
];
```

**Impact:** Finance Admin cannot approve final payment stages as specified.

---

### 4️⃣ Area Manager ⚠️ (Minor Issue)

**ISSUE:**
- ✅ **Has `pricing.approve` permission** - This is correct
- ⚠️ **But requirement says "Cannot approve pricing"** - This seems contradictory

**Clarification Needed:** 
- If Territory Manager is first level for pricing, then Area Manager should be second level (which they are)
- The requirement might be outdated, or Area Manager should NOT approve pricing if Territory Manager is first

**Current State:** Area Manager CAN approve pricing (has permission and is in pipeline)

---

## 📋 SUMMARY OF REQUIRED FIXES

### 1. Update Regional Admin Permissions
**File:** `src/utils/seedPermissions.js`
```javascript
regional_admin: [
  // ... existing ...
  "areas.manage",        // ADD
  "territories.manage", // ADD
  // ...
]
```

### 2. Update Territory Manager Permissions
**File:** `src/utils/seedPermissions.js`
```javascript
territory_manager: [
  // ... existing ...
  "pricing.view",    // ADD
  "pricing.approve", // ADD
  // ...
]
```

### 3. Update Pricing Pipeline
**File:** `src/services/workflow/pipelines.js`
```javascript
const PRICING_PIPELINE = [
  'territory_manager',  // ADD THIS
  'area_manager',
  'regional_admin',
  'super_admin',
];
```

### 4. Update Payment Pipeline
**File:** `src/services/workflow/pipelines.js`
```javascript
const PAYMENT_PIPELINE = [
  'dealer_admin',
  'territory_manager',
  'area_manager',
  'regional_manager',
  'regional_admin',
  'finance_admin',  // ADD THIS
];
```

### 5. Update Approval Engine (if used)
**File:** `src/utils/approvalEngine.js`
```javascript
pricing: {
  territory_manager: ["territory_manager", "area_manager", "regional_admin", "super_admin"], // ADD
  area_manager: ["area_manager", "regional_admin", "super_admin"],
  // ...
},
payment: {
  // ... existing stages ...
  finance_admin: ["finance_admin", "super_admin"], // ADD
},
```

---

## 🧪 TESTING CHECKLIST

After fixes, verify:

- [ ] Regional Admin can create/update areas (`POST /api/areas`, `PUT /api/areas/:id`)
- [ ] Regional Admin can create/update territories (`POST /api/territories`, `PUT /api/territories/:id`)
- [ ] Regional Admin can assign areaId to area_manager users
- [ ] Regional Admin can assign territoryId to territory_manager users
- [ ] Territory Manager can approve pricing requests at first stage
- [ ] Pricing workflow starts at `territory_manager` stage
- [ ] Finance Admin can approve payments at final stage
- [ ] Payment workflow ends at `finance_admin` stage
- [ ] All scoping still works correctly after changes

---

## 📊 IMPLEMENTATION STATUS BY ROLE

| Role | Status | Completion |
|------|--------|------------|
| Super Admin | ✅ Complete | 100% |
| Technical Admin | ✅ Complete | 100% |
| Regional Admin | ⚠️ Partial | 90% (missing area/territory management) |
| Regional Manager | ✅ Complete | 100% |
| Area Manager | ✅ Complete | 100% |
| Territory Manager | ⚠️ Partial | 95% (missing pricing approval) |
| Dealer Admin | ✅ Complete | 100% |
| Dealer Staff | ✅ Complete | 100% |
| Finance Admin | ⚠️ Partial | 90% (missing final payment approval) |
| Accounts User | ✅ Complete | 100% |
| Inventory User | ✅ Complete | 100% |

**Overall: ~85% Complete**

---

## 🚀 NEXT STEPS

1. Apply the 5 fixes listed above
2. Run permission seed script: `node src/utils/seedPermissions.js`
3. Test each role's capabilities
4. Update API documentation if needed
5. Verify workflow transitions work correctly

