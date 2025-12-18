## Frontend Integration – Dealer & Dealer-Linked Users

This guide explains how to implement **Dealer management** and the linkage between **Dealer entities** and **dealer-level users** (`dealer_admin`, `dealer_staff`) on the frontend, using the existing backend APIs.

Backend base: `http://localhost:3000/api`

---

## 1. Concepts & Roles

- **Dealer (entity, not a role)**  
  - Stored in the `Dealer` table.  
  - Represents a **company** (distributor) with fields like:
    - `dealerCode`, `businessName`, `contactPerson`, `email`, `phoneNumber`
    - `address`, `city`, `state`, `pincode`
    - `gstNumber`
    - `regionId`, `areaId`, `territoryId`
    - `managerId` (which manager user is responsible)

- **Dealer-level users (roles):**
  - `dealer_admin`
  - `dealer_staff`
  - These are **User records** that have a **foreign key `dealerId` → Dealer.id**.

> Frontend rule: when creating or editing a `dealer_admin` / `dealer_staff` user, you must let the user **select a Dealer** and send its `id` as `dealerId` in the request body.

---

## 2. Dealer Management APIs (Company-Level)

These endpoints are exposed via `src/routes/dealerRoutes.js`.

### 2.1 List Dealers

```http
GET /api/dealers
Authorization: Bearer <token>
```

- **Purpose:** List dealers the logged-in user is allowed to see (backend applies scoping).
- **Query params (optional):**
  - `page`: number (default `1`)
  - `limit`: number (default `10`)
  - `search`: string – matches `dealerCode` or `businessName`
  - `state`: string – filter by `state`
  - `isActive`: `"true"` or `"false"` – filter active/inactive

**Response shape (simplified):**

```json
{
  "dealers": [
    {
      "id": "uuid",
      "dealerCode": "D001",
      "businessName": "ABC Distributors",
      "contactPerson": "John Doe",
      "email": "john@abc.com",
      "phoneNumber": "1234567890",
      "city": "Mumbai",
      "state": "Maharashtra",
      "isActive": true,
      "isBlocked": false,
      "isVerified": true,
      "regionId": "uuid",
      "areaId": "uuid",
      "territoryId": "uuid",
      "managerId": "uuid|null"
    }
  ],
  "total": 42,
  "page": 1,
  "totalPages": 5
}
```

---

### 2.2 Get Dealer by ID

```http
GET /api/dealers/:id
Authorization: Bearer <token>
```

- Returns the dealer entity if it exists and is in the caller’s allowed scope.

---

### 2.3 Create Dealer

```http
POST /api/dealers
Authorization: Bearer <token>
Content-Type: application/json
```

**Allowed roles:** `super_admin`, `key_user`

**Body (example):**

```json
{
  "dealerCode": "D001",
  "businessName": "ABC Distributors",
  "contactPerson": "John Doe",
  "email": "john@abc.com",
  "phoneNumber": "1234567890",
  "address": "123 Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "gstNumber": "27AABCU9603R1ZM",
  "regionId": "uuid",
  "areaId": "uuid",
  "territoryId": "uuid",
  "managerId": "uuid|null",
  "lat": 19.076,
  "lng": 72.8777
}
```

**Response:** `201` with the created Dealer object.

---

### 2.4 Update Dealer

```http
PUT /api/dealers/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Allowed roles:** `super_admin`, `key_user`

- Body: same fields as create (any subset).
- Partially updates the dealer and writes an audit log.

---

### 2.5 Block / Unblock Dealer

```http
PUT /api/dealers/:id/block
Authorization: Bearer <token>
Content-Type: application/json
```

**Allowed roles:** `super_admin`

**Body:**

```json
{ "isBlocked": true }
```

- Use `true` to block, `false` to unblock.

---

### 2.6 Verify Dealer

```http
PUT /api/dealers/:id/verify
Authorization: Bearer <token>
Content-Type: application/json
```

**Allowed roles:** `super_admin`, `key_user`

- Marks the dealer as verified.

---

### 2.7 Dealer Self Profile (Dealer Users)

```http
GET /api/dealers/profile
Authorization: Bearer <token>
```

**Allowed roles:** `dealer_admin`, `dealer_staff`

- Returns the `Dealer` record where `id === req.user.dealerId`.

---

### 2.8 Dealer → My Manager

```http
GET /api/dealers/my-manager
Authorization: Bearer <token>
```

**Allowed roles:** `dealer_admin`, `dealer_staff`

- Uses `req.user.dealerId` to find the dealer, then returns its assigned manager user:

```json
{
  "manager": {
    "id": "uuid",
    "username": "manager_user",
    "email": "manager@example.com",
    "role": "territory_manager"
  }
}
```

---

## 3. Manager ↔ Dealer Assignment APIs

These endpoints are under `/api/managers` (see `src/routes/managerRoutes.js` and `managerController.js`).

### 3.1 Manager → My Dealers

```http
GET /api/managers/dealers
Authorization: Bearer <token>
```

**Allowed roles:** `territory_manager`, `area_manager`, `regional_manager`

- Returns dealers where `dealer.managerId === loggedInUser.id`, including linked `user` if present:

```json
{
  "dealers": [
    {
      "id": "uuid",
      "dealerCode": "D001",
      "businessName": "ABC Distributors",
      "managerId": "manager-uuid",
      "user": {
        "id": "uuid",
        "username": "dealer_admin_d001",
        "email": "admin@d001.com",
        "role": "dealer_admin"
      }
    }
  ]
}
```

---

### 3.2 Manager → Dealer Details (Under Me)

```http
GET /api/managers/dealers/:id
Authorization: Bearer <token>
```

**Allowed roles:** `territory_manager`, `area_manager`, `regional_manager`

- Returns a single dealer under the logged-in manager (with invoices, documents, etc.).

---

### 3.3 Assign Dealer to Manager

```http
POST /api/managers/assign-dealer
Authorization: Bearer <token>
Content-Type: application/json
```

**Allowed roles:** `super_admin`, `technical_admin`, `regional_admin`, `regional_manager`, `area_manager`, `territory_manager`

**Body:**

```json
{
  "dealerId": "dealer-uuid",
  "managerId": "user-uuid"
}
```

**Behavior:**

- Validates `dealerId` exists.
- Ensures acting user is allowed to manage this dealer (hierarchical scope).
- Sets `dealer.managerId = managerId`.

> Frontend pattern: use this for a “Assign dealer to manager” screen where an admin selects a dealer and a manager user in their scope and submits this request.

---

## 4. User Management – Dealer-Linked Users

Dealer-level users are created via the **admin user APIs** in `FRONTEND_USER_MANAGEMENT_INTEGRATION.md`.  
This section clarifies what the frontend must do **when role is `dealer_admin` or `dealer_staff`**.

### 4.1 Relevant User APIs

- **List users**  
  `GET /api/admin/users`

- **Create user**  
  `POST /api/admin/users`

- **Update user**  
  `PUT /api/admin/users/:id`

- **Update user role only**  
  `PATCH /api/admin/users/:id/role`

- **Support APIs for dropdowns**  
  - `GET /api/roles`
  - `GET /api/regions`
  - `GET /api/areas`
  - `GET /api/territories`
  - `GET /api/dealers` (used as options for `dealerId` when creating dealer-level users)

> All scoping (which users and dealers a manager can see) is enforced by the backend. The frontend should **not** implement its own region/area/territory filters, beyond UI-level filtering.

---

### 4.2 Create User – Dealer Roles

When building the **Create User** form (e.g. `CreateUserForm`), apply this logic:

1. **Base fields:**
   - `username`, `email`, `password`
   - `roleId` (selected from `GET /api/roles`)
2. **Hierarchy fields for managers:**
   - `regionId`, `areaId`, `territoryId` (dropdowns, as described in `FRONTEND_USER_MANAGEMENT_INTEGRATION.md`).
3. **Dealer-specific behavior:**

   - When **selected role is `dealer_admin` or `dealer_staff`**:
     - Show a **Dealer dropdown**.
     - Populate it using:
       ```http
       GET /api/dealers?page=1&limit=50
       ```
     - On submit, include `dealerId` in the body:
       ```json
       {
         "username": "dealer_admin_d001",
         "email": "admin@d001.com",
         "password": "Secret123",
         "roleId": 8,
         "dealerId": "dealer-uuid",
         "isActive": true
       }
       ```
     - Do **not** send region/area/territory for dealer roles – backend will clear them and only keep `dealerId`.

   - When **selected role is NOT dealer-level**:
     - Hide the Dealer dropdown.
     - Do **not** send `dealerId` (or send `null`).

**Error handling:**

- If `dealerId` is missing or invalid when role is dealer-level, backend returns:

```json
{ "error": "dealerId is required for dealer roles" }
```

- The frontend should:
  - Show this error near the Dealer dropdown.
  - Keep the form values so the user can fix the selection.

---

### 4.3 Edit User – Dealer Roles

For the **Edit User** form (`EditUserForm`):

1. **Load user data** using existing APIs (e.g. pre-populated from `GET /api/admin/users`).
2. **Detect role:**
   - If current role is `dealer_admin` / `dealer_staff`, show **Dealer dropdown** pre-filled with `user.dealerId`.
3. **Role changes:**
   - If the admin changes the user’s role **to a dealer-level role**, require a Dealer selection and send `dealerId` in `PUT /api/admin/users/:id`.
   - If the admin changes from dealer-level → non-dealer role, hide Dealer dropdown and set `dealerId = null`.

**Submit body example (update):**

```json
{
  "email": "updated@d001.com",
  "roleId": 8,
  "dealerId": "dealer-uuid",
  "isActive": true
}
```

Backend will:
- Validate `dealerId` exists and is inside the creator’s scope.
- Reject out-of-scope combinations with:

```json
{ "error": "dealerId is outside your allowed scope" }
```

Frontend should display this as a permission/validation error.

---

## 5. Recommended Frontend Screens

You can implement these using React or any other SPA framework.

### 5.1 Dealer Management

- **DealersPage**
  - Calls `GET /api/dealers` with search/filter/pagination.
  - Renders a table of dealers.
  - For each row, show actions:
    - View / Edit (navigate to `DealerForm` with id)
    - Verify (`PUT /api/dealers/:id/verify`)
    - Block / Unblock (`PUT /api/dealers/:id/block`)

- **DealerForm**
  - Used for both Create and Edit.
  - For **create**:
    - No `id` in route.
    - On submit → `POST /api/dealers`.
  - For **edit**:
    - Fetch via `GET /api/dealers/:id`.
    - On submit → `PUT /api/dealers/:id`.

- **ManagerDealersPage**
  - For `territory_manager` / `area_manager` / `regional_manager`.
  - Calls `GET /api/managers/dealers`.
  - Renders dealers assigned to this manager.

- **AssignDealerToManagerForm**
  - Calls:
    - `GET /api/dealers` for dealer list.
    - `GET /api/admin/users` to get managers (filter by `regional_manager`, `area_manager`, `territory_manager`).
  - On submit:
    - `POST /api/managers/assign-dealer` with `{ dealerId, managerId }`.

### 5.2 Dealer User Experience

- **DealerProfilePage**
  - For `dealer_admin` / `dealer_staff`.
  - Calls `GET /api/dealers/profile` to show their company info.

- **DealerMyManagerCard**
  - Small component on the dealer dashboard.
  - Calls `GET /api/dealers/my-manager` and shows the manager’s name/email.

### 5.3 User Management (already in separate guide)

Extend your existing:

- `UsersPage` – just lists users using `GET /api/admin/users`.
- `CreateUserForm` / `EditUserForm` – add Dealer dropdown behavior described in **4.2** and **4.3** for `dealer_admin` / `dealer_staff`.

---

## 6. Integration Checklist

When implementing the frontend, make sure:

1. **Dealer CRUD** is wired:
   - `GET /api/dealers`, `GET /api/dealers/:id`, `POST /api/dealers`, `PUT /api/dealers/:id`, `PUT /api/dealers/:id/verify`, `PUT /api/dealers/:id/block`.
2. **Manager ↔ Dealer views** are wired:
   - `GET /api/managers/dealers`, `GET /api/managers/dealers/:id`, `POST /api/managers/assign-dealer`.
3. **Dealer-linked users**:
   - When role is `dealer_admin` / `dealer_staff`, show dealer selector fed by `GET /api/dealers`.
   - Always send `dealerId` for dealer-level users on create/update.
4. **Error handling**:
   - Display `400` validation errors (`dealerId is required for dealer roles`, `Invalid dealerId`).
   - Display `403` errors (`dealerId is outside your allowed scope`, `Access denied`) as permission errors.

Following this guide will ensure the frontend correctly models **Dealers (companies)** and their **associated users** and respects all hierarchical rules already enforced by the backend.


