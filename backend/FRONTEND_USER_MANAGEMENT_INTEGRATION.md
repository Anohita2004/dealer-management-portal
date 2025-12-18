## Frontend Integration – Hierarchical User Management

This guide explains how to implement the **User Management** UI in the frontend using only the existing backend APIs, with full respect for the hierarchy defined in `documentr.pdf`.

Backend base: `http://localhost:3000/api`

---

## 1. Roles & Hierarchical Scope (Summary)

- **Global user admins**
  - `super_admin`, `technical_admin`
  - Can list / create / update / delete **any** user of any role.

- **Regional-level user admins**
  - `regional_admin`, `regional_manager`
  - Can manage **only users inside their region**:
    - Users with `regionId === my.regionId`, or
    - Users attached to dealers whose `regionId === my.regionId`.

- **Area-level user admins**
  - `area_manager`
  - Can manage only users in their **area**:
    - Users with `areaId === my.areaId`, or
    - Users attached to dealers whose `areaId === my.areaId`.

- **Territory-level user admins**
  - `territory_manager`
  - Can manage only users in their **territory**:
    - Users with `territoryId === my.territoryId`, or
    - Users attached to dealers whose `territoryId === my.territoryId`.

Backend enforces all of the above – the frontend does **not** need to manually filter by region/area/territory.

---

## 2. Core User Management APIs

### 2.1 List Users

```http
GET /api/admin/users
Authorization: Bearer <token>
```

- **Allowed roles:** `super_admin`, `technical_admin`, `regional_admin`, `regional_manager`, `area_manager`, `territory_manager`
- **Scoping:** Automatically limited to the caller’s hierarchy.

**Response shape:**

```json
{
  "users": [
    {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "roleId": 4,
      "roleDetails": { "id": 4, "name": "regional_manager" },
      "regionId": "uuid|null",
      "areaId": "uuid|null",
      "territoryId": "uuid|null",
      "dealerId": "uuid|null",
      "dealer": {
        "id": "uuid",
        "dealerCode": "D001",
        "businessName": "ABC Distributors"
      }
    }
  ],
  "total": 42,
  "page": 1,
  "totalPages": 5
}
```

> Frontend contract: build a Users table using this response; **do not apply custom scope filters**. Use `roleDetails.name` to display the role.

---

### 2.2 Create User

```http
POST /api/admin/users
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**

```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "roleId": 4,
  "regionId": "uuid|null",
  "areaId": "uuid|null",
  "territoryId": "uuid|null",
  "dealerId": "uuid|null",
  "managerId": "uuid|null",
  "salesGroupId": null,
  "isActive": true
}
```

**Backend behavior (key points):**

- **Super / Technical Admin**
  - Can set any `regionId`, `areaId`, `territoryId`, `dealerId` (validated as normal FKs).

- **Regional / Area / Territory Managers**
  - Backend **overwrites** hierarchy fields so the new user is always inside the creator’s scope:
    - `regional_admin` / `regional_manager`: `regionId` is forced to `req.user.regionId`.
    - `area_manager`: `regionId` and `areaId` forced to the creator’s.
    - `territory_manager`: `regionId`, `areaId`, `territoryId` forced to the creator’s.

- **Dealer roles (`dealer_admin`, `dealer_staff`)**
  - `dealerId` is **required**.
  - Dealer must be inside the creator’s region/area/territory.
  - If not, the API responds with:
    - `403` and `{ "error": "dealerId is outside your allowed scope" }`.

> Frontend contract:
> - Show appropriate selectors (role, region, area, territory, dealer).
> - Let backend reject out-of-scope combinations instead of duplicating the scoping logic.

---

### 2.3 Update User

```http
PUT /api/admin/users/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Body (partial or full):**

```json
{
  "username": "optional string",
  "email": "optional string",
  "password": "optional string",
  "roleId": 4,
  "regionId": "uuid|null",
  "areaId": "uuid|null",
  "territoryId": "uuid|null",
  "dealerId": "uuid|null",
  "isActive": true
}
```

**Behavior:**

- Same scope enforcement as **create**:
  - Acting user must be allowed to manage the target user (inside scope).
  - Hierarchy fields are clamped to the actor’s own hierarchy for non-global roles.
  - Dealer assignments are validated against scope for dealer-level users.

Error responses you should handle:

- `403` – `"Access denied - User not in your scope"`  
- `400` – `"Invalid regionId" | "Invalid areaId" | "Invalid territoryId" | "Invalid dealerId"`

---

### 2.4 Update User Role

```http
PATCH /api/admin/users/:id/role
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**

```json
{ "roleId": 4 }
```

**Rules:**

- Only `super_admin`, `technical_admin`, `regional_admin`, `regional_manager`, `area_manager`, `territory_manager`.
- Target user must be in the actor’s hierarchical scope (same checks as above).

---

### 2.5 Delete User

```http
DELETE /api/admin/users/:id
Authorization: Bearer <token>
```

- Same scope rules: actor must be allowed to manage this user.

---

## 3. Supporting APIs (Selectors)

These endpoints populate dropdowns in your user forms:

- **Roles**
  - `GET /api/roles`
  - Use to build a `<RoleSelector>` component.

- **Regions / Areas / Territories**
  - `GET /api/regions`
  - `GET /api/areas`
  - `GET /api/territories`
  - Responses are automatically scoped:
    - Regional admins / managers see their region(s).
    - Area managers see their area.
    - Territory managers see their territory.

- **Dealers**
  - `GET /api/dealers?page=1&limit=50`
  - Returns dealers **in scope for the logged-in user**.
  - Use this for `dealerId` selection when creating dealer-level users and when assigning dealers to managers.

---

## 4. Assigning Dealers to Managers

Use this to wire “which dealers are under which manager” in the frontend.

### 4.1 API: Assign Dealer → Manager

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

- Dealer must be inside the acting user’s scope:
  - Regional-level: same `regionId`.
  - Area-level: same `areaId`.
  - Territory-level: same `territoryId`.
- If dealer is outside scope → `403` and `{ "error": "Dealer is outside your scope" }`.

Frontend pattern:

1. Fetch in-scope **dealers** with `GET /api/dealers`.
2. Fetch in-scope **managers** with `GET /api/admin/users` and filter client-side to `regional_manager`, `area_manager`, `territory_manager`.
3. Post selection to `/api/managers/assign-dealer`.

### 4.2 API: Manager → My Dealers

```http
GET /api/managers/dealers
Authorization: Bearer <token>
```

- Returns dealers where `dealer.managerId === loggedInUser.id`, with:

```json
{
  "dealers": [
    {
      "id": "uuid",
      "dealerCode": "D001",
      "businessName": "ABC Distributors",
      "isBlocked": false,
      "outstandingAmount": "12345.67",
      "invoices": [ /* latest invoices */ ],
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

Use this to build the **“Dealers under me”** view for territory/area/regional managers.

---

## 5. Recommended Frontend Components (Contract Only)

You can implement these with React (as suggested in `FRONTEND_IMPLEMENTATION_PROMPT.md`):

- `UsersPage`
  - Calls `GET /api/admin/users`.
  - Renders table of users.
  - Shows “Create User” and “Edit” actions based on role/permissions.

- `CreateUserForm` / `EditUserForm`
  - Uses:
    - `GET /api/roles` → role dropdown.
    - `GET /api/regions`, `/api/areas`, `/api/territories` → hierarchy dropdowns.
    - `GET /api/dealers` → dealer dropdown.
  - On submit:
    - `POST /api/admin/users` for create.
    - `PUT /api/admin/users/:id` for edit.
  - Shows backend errors (400/403) inline.

- `AssignDealerToManagerForm`
  - Dealers: `GET /api/dealers`.
  - Managers: `GET /api/admin/users` (filter by manager roles).
  - Submit: `POST /api/managers/assign-dealer`.

> These components should call the APIs described here and **let the backend enforce** all hierarchy and scoping rules. Frontend only needs to:
> - Show the right fields,
> - Wire selects to the correct endpoints,
> - Surface error messages back to the user.

---

## 6. Error Handling Patterns (Frontend)

When integrating, handle these patterns:

- `401 Unauthorized` → clear token and redirect to `/login`.
- `403 Forbidden` → show “You do not have permission to perform this action” (or use the exact `error` string from the response).
- `400 Bad Request` → show validation error from `error` string (e.g., invalid FK).

This ensures the UI stays in sync with backend RBAC and hierarchical scoping.


