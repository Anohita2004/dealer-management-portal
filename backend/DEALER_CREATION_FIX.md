# Dealer Creation Fix

## 🔴 Issue Identified

The "Create Dealer" option was not showing in the frontend because:

1. **Route Authorization Mismatch**: The route checked for `'key_user'` but the system uses `'technical_admin'` as the canonical role name
2. **Missing Permission**: `technical_admin` role didn't have `dealer.create` permission
3. **Missing Permission**: `regional_manager` role didn't have `dealer.create` permission (but route allowed it)

## ✅ Fixes Applied

### 1. Updated Route Authorization
**File:** `src/routes/dealerRoutes.js`

Changed from:
```javascript
authorize('super_admin', 'key_user', 'regional_admin', 'regional_manager', 'area_manager')
```

To:
```javascript
authorize('super_admin', 'technical_admin', 'key_user', 'regional_admin', 'regional_manager', 'area_manager')
```

This now supports both:
- `technical_admin` (canonical role name)
- `key_user` (legacy role name, mapped to `technical_admin`)

### 2. Added `dealer.create` Permission to `technical_admin`
**File:** `src/utils/seedPermissions.js`

Added permissions:
```javascript
technical_admin: [
  // ... existing permissions
  "dealer.view", "dealer.create", "dealer.update",
  // ... rest of permissions
]
```

### 3. Added `dealer.create` Permission to `regional_manager`
**File:** `src/utils/seedPermissions.js`

Added permission:
```javascript
regional_manager: [
  "dealer.view", "dealer.create", "dealer.update",
  // ... rest of permissions
]
```

### 4. Updated Other Dealer Routes
Also updated `PUT /api/dealers/:id` and `PUT /api/dealers/:id/verify` to include `technical_admin`.

## 📋 Roles That Can Create Dealers

After this fix, the following roles can create dealers:

1. ✅ `super_admin` - All permissions (including dealer.create)
2. ✅ `technical_admin` - Now has dealer.create permission
3. ✅ `key_user` - Legacy name, mapped to technical_admin
4. ✅ `regional_admin` - Already had dealer.create
5. ✅ `regional_manager` - Now has dealer.create permission
6. ✅ `area_manager` - Already had dealer.create (via route authorization)

## 🔄 Next Steps

### 1. Update Permissions in Database

If permissions are already seeded, you need to update the database:

```sql
-- Add dealer.create permission to technical_admin role
INSERT INTO RolePermissions (roleId, permissionId)
SELECT r.id, p.id
FROM Roles r, Permissions p
WHERE r.name = 'technical_admin' 
  AND p.key = 'dealer.create'
  AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp 
    WHERE rp.roleId = r.id AND rp.permissionId = p.id
  );

-- Add dealer.create permission to regional_manager role
INSERT INTO RolePermissions (roleId, permissionId)
SELECT r.id, p.id
FROM Roles r, Permissions p
WHERE r.name = 'regional_manager' 
  AND p.key = 'dealer.create'
  AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp 
    WHERE rp.roleId = r.id AND rp.permissionId = p.id
  );
```

### 2. Or Re-run Permission Seeding

If you have a seed script, re-run it to update permissions:

```bash
node src/utils/seedPermissions.js
```

### 3. Frontend Check

The frontend should check for `dealer.create` permission to show the "Create Dealer" button:

```javascript
// Check if user can create dealers
const canCreateDealer = user.permissions?.includes('dealer.create') || 
                        ['super_admin', 'technical_admin', 'regional_admin', 'regional_manager', 'area_manager'].includes(user.role);
```

## 🧪 Testing

1. **Login as `super_admin`** - Should see "Create Dealer" option ✅
2. **Login as `technical_admin`** - Should now see "Create Dealer" option ✅
3. **Login as `regional_admin`** - Should see "Create Dealer" option ✅
4. **Login as `regional_manager`** - Should now see "Create Dealer" option ✅
5. **Login as `area_manager`** - Should see "Create Dealer" option ✅

## 📝 API Endpoint

**POST** `/api/dealers`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "dealerCode": "D001",
  "businessName": "ABC Dealers",
  "contactPerson": "John Doe",
  "email": "contact@abcdealers.com",
  "phone": "+1234567890",
  "address": "123 Main St",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "regionId": "uuid",
  "areaId": "uuid",
  "territoryId": "uuid"
}
```

**Response:**
```json
{
  "id": "uuid",
  "dealerCode": "D001",
  "businessName": "ABC Dealers",
  "status": "pending_approval",
  "isActive": false,
  "isVerified": false,
  ...
}
```

