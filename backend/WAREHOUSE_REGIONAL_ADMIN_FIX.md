# Warehouse Management for Regional Admins - Implementation

## ✅ Changes Made

### 1. Added `warehouse.manage` Permission to Regional Admin
**File:** `src/utils/seedPermissions.js`

Added `"warehouse.manage"` permission to `regional_admin` role, allowing them to:
- Create warehouses
- Update warehouses
- Delete/deactivate warehouses

### 2. Enhanced Warehouse Creation with Region Validation
**File:** `src/controllers/warehouseController.js`

Added validation to ensure regional admins can only create warehouses in their assigned region:
- Checks if regional admin is assigned to a region
- Validates that `regionId` in request matches user's `regionId`
- Returns clear error messages if validation fails

### 3. Enhanced Warehouse Update with Region Validation
**File:** `src/controllers/warehouseController.js`

Added validation to ensure regional admins can only:
- Update warehouses in their region
- Cannot change `regionId` to a different region

### 4. Improved Error Handling
- Better error messages for validation failures
- Handles unique constraint errors gracefully
- Detailed logging for debugging

## 📋 Permissions Summary

### Regional Admin Warehouse Permissions:
- ✅ `warehouse.view` - View warehouses in their region
- ✅ `warehouse.manage` - Create, update, and manage warehouses in their region

## 🔒 Access Control

### Viewing Warehouses
- Regional admins can only see warehouses in their assigned region
- Scoping is handled automatically by `applyScope(["Warehouse"])` middleware
- Uses `RBACEngine.buildScopeWhereClause()` which filters by `regionId`

### Creating Warehouses
- Regional admins **must** provide `regionId` in the request
- `regionId` **must** match the user's assigned `regionId`
- Cannot create warehouses in other regions

### Updating Warehouses
- Regional admins can only update warehouses in their region
- Cannot change a warehouse's `regionId` to a different region
- Can update other fields (name, address, coordinates, etc.)

## 📝 API Usage

### Create Warehouse (Regional Admin)

**POST** `/api/warehouses`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "warehouseCode": "WH-REGION1-001",
  "name": "North Region Warehouse",
  "address": "123 Warehouse St",
  "city": "Delhi",
  "state": "Delhi",
  "pincode": "110001",
  "lat": 28.6139,
  "lng": 77.2090,
  "regionId": "uuid-of-regional-admin's-region",  // REQUIRED - must match user's regionId
  "areaId": "uuid-of-area",  // Optional
  "contactPerson": "John Doe",
  "phoneNumber": "+1234567890",
  "email": "warehouse@example.com"
}
```

**Success Response (201):**
```json
{
  "id": "uuid",
  "warehouseCode": "WH-REGION1-001",
  "name": "North Region Warehouse",
  "regionId": "uuid",
  "areaId": "uuid",
  ...
}
```

**Error Response (403) - Wrong Region:**
```json
{
  "error": "Cannot create warehouse outside your region",
  "message": "You can only create warehouses in region <region-id>"
}
```

### Update Warehouse (Regional Admin)

**PUT** `/api/warehouses/:id`

**Request Body:**
```json
{
  "name": "Updated Warehouse Name",
  "address": "New Address",
  "lat": 28.6139,
  "lng": 77.2090
  // Note: regionId cannot be changed to a different region
}
```

## 🔄 Database Update Required

After updating the permissions file, you need to update the database:

```sql
-- Add warehouse.manage permission to regional_admin role
INSERT INTO RolePermissions (roleId, permissionId)
SELECT r.id, p.id
FROM Roles r, Permissions p
WHERE r.name = 'regional_admin' 
  AND p.key = 'warehouse.manage'
  AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp 
    WHERE rp.roleId = r.id AND rp.permissionId = p.id
  );
```

Or re-run the permission seeding script if available.

## 🧪 Testing Checklist

- [ ] Regional admin can view warehouses in their region
- [ ] Regional admin can create warehouse with correct regionId
- [ ] Regional admin gets 403 error when trying to create warehouse with wrong regionId
- [ ] Regional admin can update warehouses in their region
- [ ] Regional admin gets 403 error when trying to update warehouse in different region
- [ ] Regional admin cannot change warehouse regionId to different region
- [ ] Super admin can still create/update warehouses in any region
- [ ] Warehouse scoping works correctly for viewing

## 📊 Role Comparison

| Role | View Warehouses | Create Warehouses | Update Warehouses | Scope |
|------|----------------|-------------------|-------------------|-------|
| `super_admin` | ✅ All | ✅ All | ✅ All | Global |
| `technical_admin` | ✅ All | ✅ All | ✅ All | Global |
| `regional_admin` | ✅ Region only | ✅ Region only | ✅ Region only | Region |
| `regional_manager` | ✅ Region only | ❌ No | ❌ No | Region |
| `area_manager` | ✅ Area only | ❌ No | ❌ No | Area |
| `inventory_user` | ✅ All | ✅ All | ✅ All | Global |

