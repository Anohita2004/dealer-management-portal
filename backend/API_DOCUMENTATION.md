# Dealer Management Portal - Complete API Documentation

## Table of Contents
1. [Authentication & Authorization](#authentication--authorization)
2. [API Endpoints by Module](#api-endpoints-by-module)
3. [WebSocket Events](#websocket-events)
4. [Data Models & Relationships](#data-models--relationships)
5. [Role-Based Access Patterns](#role-based-access-patterns)
6. [Workflow States](#workflow-states)
7. [Error Handling](#error-handling)
8. [Feature Toggles](#feature-toggles)

---

## Authentication & Authorization

### Base URL
```
http://localhost:3000/api
```

### Authentication
All endpoints (except `/api/auth/*`) require JWT token in header:
```
Authorization: Bearer <token>
```

### Token Format
After login, you receive:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "role": "super_admin" | "technical_admin" | "regional_admin" | ...,
    "roleId": 1,
    "regionId": "uuid" | null,
    "areaId": "uuid" | null,
    "territoryId": "uuid" | null,
    "dealerId": "uuid" | null
  }
}
```

### Role Hierarchy
```
super_admin (sees all)
  ├── technical_admin (permissions only)
  ├── regional_admin (one region)
  │   ├── regional_manager
  │   ├── area_manager
  │   │   └── territory_manager
  │   └── dealer_admin
  │       └── dealer_staff
  └── finance_admin
```

---

## API Endpoints by Module

### 🔐 Authentication

#### POST `/api/auth/login`
```json
// Request
{
  "username": "string",
  "password": "string"
}

// Response
{
  "token": "jwt_token",
  "user": { ... }
}
```

#### POST `/api/auth/register`
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "roleId": 1,
  "regionId": "uuid" | null,
  "areaId": "uuid" | null,
  "territoryId": "uuid" | null,
  "dealerId": "uuid" | null,
  "managerId": "uuid" | null
}
```

---

### 👥 User Management

> Hierarchical user management fully matches the role design in `documentr.pdf` – Super/Technical Admin can manage all users, while regional/area/territory managers can only manage users (and dealers) inside their scope.

#### GET `/api/admin/users`
**Roles:** `super_admin`, `technical_admin`, `regional_admin`, `regional_manager`, `area_manager`, `territory_manager`  
**Scoping:**
- `super_admin`, `technical_admin`: see **all** users  
- `regional_admin`, `regional_manager`: users in their `regionId` or attached to dealers in their region  
- `area_manager`: users in their `areaId` or attached to dealers in their area  
- `territory_manager`: users in their `territoryId` or attached to dealers in their territory  

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "roleId": 1,
      "roleDetails": { "id": 1, "name": "regional_manager" },
      "regionId": "uuid|null",
      "areaId": "uuid|null",
      "territoryId": "uuid|null",
      "dealerId": "uuid|null",
      "dealer": { "id": "uuid", "businessName": "ABC Distributors", "dealerCode": "D001" }
    }
  ],
  "total": 42,
  "page": 1,
  "totalPages": 5
}
```

#### POST `/api/admin/users`
**Roles:** `super_admin`, `technical_admin`, `regional_admin`, `regional_manager`, `area_manager`, `territory_manager`  
**Behavior:**
- Super/Technical Admin: can set any `regionId`, `areaId`, `territoryId`, `dealerId` (subject to FK validation).
- Regional/Area/Territory managers: backend **overrides** hierarchy fields so the new user is **forced into the creator’s scope** (region/area/territory).
- When creating `dealer_admin` or `dealer_staff` users, `dealerId` is **required** and the selected dealer must be inside the creator’s scope.

**Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "roleId": 1,
  "regionId": "uuid|null",
  "areaId": "uuid|null",
  "territoryId": "uuid|null",
  "dealerId": "uuid|null",
  "managerId": "uuid|null",
  "salesGroupId": 1,
  "isActive": true
}
```

#### PUT `/api/admin/users/:id`
**Roles:** `super_admin`, `technical_admin`, `regional_admin`, `regional_manager`, `area_manager`, `territory_manager`  
**Behavior:** identical scoping rules as `POST /api/admin/users` – hierarchy fields are clamped to creator’s scope; dealer assignments must remain within scope.

#### PATCH `/api/admin/users/:id/role`
**Roles:** `super_admin`, `technical_admin`, `regional_admin`, `regional_manager`, `area_manager`, `territory_manager`  
**Behavior:** role change is allowed only if the target user is inside the actor’s scope.

---

### 🏢 Dealer Management

#### GET `/api/dealers`
**Scoped:** Regional Admin sees only their region, Managers see assigned dealers  
**Query Params:** `?page=1&limit=10&regionId=uuid&areaId=uuid&territoryId=uuid`

#### GET `/api/dealers/:id`
**Scoped:** Dealers can only see themselves

#### POST `/api/dealers`
**Permissions:** `super_admin`, `key_user`  
**Body:**
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
  "managerId": "uuid",
  "lat": 19.0760,
  "lng": 72.8777
}
```

#### GET `/api/dealers/my-manager`
**Permissions:** `dealer_admin`, `dealer_staff`  
**Returns:** Manager assigned to dealer

---

### 📦 Orders

#### POST `/api/orders`
**Permissions:** `dealer_admin`, `dealer_staff`  
**Body:**
```json
{
  "items": [
    {
      "materialId": "uuid",
      "qty": 10,
      "unitPrice": 1000
    }
  ],
  "notes": "string"
}
```
**Response:**
```json
{
  "orderId": "uuid",
  "orderNumber": "ORD-1234567890",
  "approvalStage": "territory_manager",
  "approvalStatus": "pending"
}
```

#### GET `/api/orders/my`
**Permissions:** `dealer_admin`, `dealer_staff`  
**Returns:** Own orders only

#### GET `/api/orders`
**Permissions:** `dealer_admin`, `regional_manager`, `regional_admin`, `super_admin`  
**Scoped:** Managers see only their territory/area/region

#### PATCH `/api/orders/:id/approve`
**Permissions:** Based on approval stage  
**Body:**
```json
{
  "action": "approve" | "reject",
  "reason": "string" // if reject
}
```

**Approval Flow:**
```
dealer_staff creates → territory_manager → area_manager → regional_manager → approved
```

#### PATCH `/api/orders/:id/reject`
**Permissions:** Any approver in current stage

---

### 🧾 Invoices

#### POST `/api/invoices`
**Permissions:** `super_admin`, `key_user`, `dealer_staff`  
**Body:**
```json
{
  "orderId": "uuid", // required for dealer_staff
  "invoiceNumber": "INV-2024-001",
  "baseAmount": 100000,
  "taxAmount": 18000,
  "invoiceDate": "2024-01-15",
  "dueDate": "2024-02-15"
}
```

#### GET `/api/invoices`
**Scoped:** Dealers see only their invoices, Managers see scoped invoices

#### GET `/api/invoices/pending/approvals`
**Permissions:** `dealer_admin`, `territory_manager`, `area_manager`, `regional_manager`, `regional_admin`  
**Returns:** Pending invoices at current user's approval stage

#### POST `/api/invoices/:id/approve`
**Body:**
```json
{
  "action": "approve" | "reject",
  "reason": "string"
}
```

**Approval Flow:**
```
dealer_staff creates → dealer_admin → territory_manager → area_manager → regional_manager → regional_admin → approved
```

#### GET `/api/invoices/:id/pdf`
**Returns:** PDF file download

---

### 💰 Payments

#### POST `/api/payments/request`
**Permissions:** `dealer_staff`, `dealer_admin`  
**Body (multipart/form-data):**
```
invoiceId: uuid
amount: number
paymentMode: "NEFT" | "RTGS" | "CHEQUE" | "CASH"
utrNumber: string
proofFile: File
```

#### GET `/api/payments/mine`
**Returns:** Own payment requests

#### GET `/api/payments/pending`
**Permissions:** `finance_admin`  
**Returns:** All pending payments

#### GET `/api/payments/dealer/pending`
**Permissions:** `dealer_admin`  
**Returns:** Pending payments for dealer's staff

#### POST `/api/payments/:id/approve`
**Permissions:** Based on approval stage

**Approval Flow:**
```
dealer_staff creates → dealer_admin → territory_manager → area_manager → regional_manager → regional_admin → approved
```

---

### 📄 Documents

#### POST `/api/documents`
**Permissions:** All authenticated users  
**Body (multipart/form-data):**
```
file: File
documentType: "LICENSE" | "GST" | "PAN" | "BANK_STATEMENT" | "OTHER"
description: string
dealerId: uuid // optional, auto-set for dealers
```

#### GET `/api/documents`
**Scoped:** Dealers see only their documents

#### GET `/api/documents/manager`
**Permissions:** `territory_manager`, `area_manager`, `regional_manager`  
**Returns:** Documents from dealers under manager

#### PATCH `/api/documents/:id/status`
**Permissions:** `super_admin`, `territory_manager`, `area_manager`  
**Body:**
```json
{
  "action": "approve" | "reject",
  "reason": "string"
}
```

**Approval Flow:**
```
uploaded → dealer_admin → territory_manager → area_manager → regional_manager → approved
```

---

### 🎯 Campaigns

#### GET `/api/campaigns`
**Scoped:** Filtered by `targetAudience` - dealers see only campaigns targeting them  
**Query Params:** `?page=1&limit=10&isActive=true&campaignType=promotion`

#### GET `/api/campaigns/active`
**Permissions:** `dealer_admin`, `territory_manager`, `area_manager`, `super_admin`

#### GET `/api/campaigns/:id`
**Returns:** Single campaign details

#### GET `/api/campaigns/:id/analytics`
**Permissions:** `super_admin`, `regional_admin`, `area_manager`  
**Returns:**
```json
{
  "campaignId": "uuid",
  "campaignName": "Summer Sale",
  "participation": {
    "totalTargeted": 50,
    "participated": 30,
    "participationRate": "60.00"
  },
  "revenue": {
    "total": 5000000,
    "attributed": 750000
  },
  "period": {
    "start": "2024-04-01",
    "end": "2024-06-30"
  }
}
```

#### POST `/api/campaigns`
**Permissions:** `super_admin`, `key_user`  
**Body:**
```json
{
  "campaignName": "Summer Sale 2024",
  "campaignType": "promotion" | "sales_scheme" | "seasonal_offer",
  "description": "Special discounts",
  "startDate": "2024-04-01",
  "endDate": "2024-06-30",
  "productGroup": "Electronics",
  "discountPercentage": 15,
  "targetAudience": [
    { "type": "region", "entityId": "uuid" },
    { "type": "territory", "entityId": "uuid" },
    { "type": "dealer", "entityId": "uuid" },
    { "type": "all" }
  ],
  "terms": "Valid on bulk orders"
}
```

#### PUT `/api/campaigns/:id`
**Permissions:** `super_admin`, `key_user`

#### DELETE `/api/campaigns/:id`
**Permissions:** `super_admin`, `key_user`

---

### 🗺️ Maps

#### GET `/api/maps/dealers`
**Scoped:** Regional Admin sees region only, Managers see territory/area, Dealers see own pin  
**Query Params:** `?regionId=uuid&territoryId=uuid&start=2024-01-01&end=2024-12-31`  
**Returns:**
```json
[
  {
    "id": "uuid",
    "name": "ABC Distributors",
    "dealerCode": "D001",
    "lat": 19.0760,
    "lng": 72.8777,
    "regionId": "uuid",
    "territoryId": "uuid",
    "totalSales": 500000
  }
]
```

#### GET `/api/maps/heatmap`
**Query Params:** `?granularity=dealer|territory|region&start=2024-01-01&end=2024-12-31`  
**Returns:**
```json
[
  {
    "lat": 19.0760,
    "lng": 72.8777,
    "weight": 500000
  }
]
```

#### GET `/api/maps/regions`
**Returns:** GeoJSON FeatureCollection of regions

#### GET `/api/maps/territories`
**Query Params:** `?regionId=uuid`  
**Returns:** GeoJSON FeatureCollection of territories

---

### 📊 Reports & Dashboards

#### GET `/api/reports/dashboard/super`
**Permissions:** `super_admin`  
**Returns:**
```json
{
  "totalDealers": 500,
  "totalInvoices": 10000,
  "totalOutstanding": 50000000,
  "totalApprovalsPending": 150,
  "activeCampaigns": 8,
  "regions": [...]
}
```

#### GET `/api/reports/dashboard/regional`
**Permissions:** `regional_admin`  
**Returns:** Region-scoped summary

#### GET `/api/reports/dashboard/manager`
**Permissions:** `territory_manager`, `area_manager`, `regional_manager`  
**Returns:** Territory/area-scoped summary

#### GET `/api/reports/dashboard/dealer`
**Permissions:** `dealer_admin`, `dealer_staff`  
**Returns:** Dealer's own summary

#### GET `/api/reports/dealer-performance`
**Scoped:** Dealers see own, Admins see all

#### GET `/api/reports/regional-sales-summary`
**Permissions:** `super_admin`, `area_manager`, `territory_manager`, `regional_manager`, `regional_admin`  
**Returns:** Hierarchical sales breakdown by region → territory → dealer

#### GET `/api/reports/pending-approvals`
**Permissions:** `super_admin`, `area_manager`, `territory_manager`, `regional_manager`, `regional_admin`  
**Returns:** All pending approvals scoped by role

---

### 💵 Pricing

#### POST `/api/pricing/request`
**Permissions:** `dealer_staff`, `dealer_admin`, `area_manager`, `territory_manager`, `regional_manager`  
**Body:**
```json
{
  "productId": "uuid",
  "oldPrice": 1000,
  "newPrice": 900,
  "reason": "Market competition"
}
```

#### GET `/api/pricing`
**Scoped:** Dealers see own requests, Managers see scoped requests

#### GET `/api/pricing/manager`
**Permissions:** `area_manager`, `territory_manager`, `regional_manager`  
**Returns:** Pricing requests from dealers under manager

#### GET `/api/pricing/pending`
**Permissions:** `area_manager`, `regional_admin`, `super_admin`  
**Returns:** Pending pricing requests at current stage

#### PATCH `/api/pricing/:id`
**Body:**
```json
{
  "action": "approve" | "reject",
  "remarks": "string"
}
```

**Approval Flow:**
```
requested → area_manager → regional_admin → super_admin → approved (product price updated)
```

---

### 📍 Geography (Regions, Areas, Territories)

#### Regions

##### GET `/api/regions`
**Description:** List regions (with basic area & dealer info)

##### POST `/api/regions`
**Description:** Create region (super_admin only)

##### GET `/api/regions/:id`
**Description:** Get single region with nested areas, territories & dealers

##### PUT `/api/regions/:id`
**Description:** Update region (super_admin only)

##### DELETE `/api/regions/:id`
**Description:** Delete region (super_admin only; requires no attached areas/dealers)

##### GET `/api/regions/dashboard/summary`
**Permissions:** `dashboard.view.regional`  
**Description:** Regional dashboard summary for the logged-in regional admin/manager

#### Areas

##### GET `/api/areas`
**Description:** List areas

##### GET `/api/areas/dashboard/summary`
**Permissions:** `dashboard.view.manager`  
**Description:** Area dashboard summary

#### Territories

##### GET `/api/territories`
**Description:** List territories

---

### 👔 Teams

#### GET `/api/teams`
**Permissions:** `teams.view`

#### POST `/api/teams`
**Permissions:** `teams.manage`  
**Body:**
```json
{
  "name": "Sales Team Alpha",
  "region": "Mumbai",
  "description": "Primary sales team"
}
```

#### POST `/api/teams/:teamId/dealers`
**Permissions:** `teams.manage`  
**Body:**
```json
{
  "dealerId": "uuid"
}
```

---

### 📦 Inventory

#### GET `/api/inventory/summary`
**Permissions:** `inventory_user`, `super_admin`, `key_user`, `dealer_admin`, `tm`  
**Scoped:** Dealers see limited info, Managers see plant info, Admins see all

#### GET `/api/inventory/details`
**Permissions:** `inventory_user`, `super_admin`

#### POST `/api/inventory`
**Permissions:** `inventory_user`, `super_admin`  
**Body:**
```json
{
  "name": "Laptop",
  "plant": "Mumbai",
  "stock": 100,
  "uom": "Units",
  "sapMaterialNumber": "MAT001"
}
```

#### GET `/api/inventory/export?format=excel|pdf`
**Permissions:** `inventory_user`, `super_admin`, `key_user`

---

### 🔔 Notifications

#### GET `/api/notifications`
**Permissions:** `notifications.view`  
**Query Params:** `?page=1&limit=50&unreadOnly=true`  
**Returns:**
```json
{
  "notifications": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  }
}
```

#### PUT `/api/notifications/:id/read`
**Marks notification as read**

#### PUT `/api/notifications/read-all`
**Marks all as read**

#### GET `/api/notifications/unread/count`
**Returns:** `{ "unreadCount": 5 }`

---

### ✅ Tasks

#### GET `/api/tasks`
**Returns:** Pending tasks for current user based on role  
**Response:**
```json
{
  "tasks": [
    {
      "id": "uuid",
      "type": "order" | "invoice" | "payment" | "document" | "pricing",
      "title": "Order ORD-123 requires approval",
      "entityId": "uuid",
      "dealerName": "ABC Distributors",
      "createdAt": "2024-01-15T10:00:00Z",
      "stage": "territory_manager",
      "priority": "normal"
    }
  ],
  "total": 25,
  "byType": {
    "order": 10,
    "invoice": 5,
    "payment": 3,
    "document": 4,
    "pricing": 3
  }
}
```

---

### ⚙️ Feature Toggles

#### GET `/api/feature-toggles`
**Permissions:** `system.config`  
**Returns:** All feature toggles

#### GET `/api/feature-toggles/:key`
**Returns:** Single toggle (e.g., `pricing_approvals`, `order_flow`)

#### POST `/api/feature-toggles`
**Permissions:** `system.config`  
**Body:**
```json
{
  "key": "pricing_approvals",
  "name": "Pricing Approvals",
  "description": "Enable/disable pricing approval workflow",
  "isEnabled": true,
  "config": {}
}
```

---

### 🔧 System Admin

#### POST `/api/admin/sla/run`
**Permissions:** `super_admin`, `technical_admin`  
**Manually triggers SLA check**  
**Returns:** Count of overdue items and notifications sent

---

## WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'jwt_token'
  }
});
```

### Authentication
```javascript
socket.emit('authenticate', { token: 'jwt_token' });
socket.on('authenticated', (data) => {
  // data: { ok: true, user: {...} }
});
```

### Rooms
- `user:{userId}` - User-specific room
- `role:{roleName}` - Role broadcast room
- `chat:{user1}-{user2}` - 1-on-1 chat room

### Events

#### Notifications
```javascript
socket.on('notification', (data) => {
  // { id, title, message, type, priority, actionUrl, createdAt }
});

socket.on('notification:new', (notification) => { ... });
socket.on('notification:update', (summary) => { ... });
```

#### Orders
```javascript
socket.on('order:new', (data) => { ... });
socket.on('order:pending:update', () => { ... });
```

#### Invoices
```javascript
socket.on('invoice:new', (data) => { ... });
socket.on('invoice:pending:update', () => { ... });
```

#### Documents
```javascript
socket.on('document:new', (data) => { ... });
socket.on('document:pending:update', () => { ... });
```

#### Messages
```javascript
socket.on('message:new', (message) => { ... });
socket.on('typing', (data) => {
  // { userId, isTyping }
});
```

---

## Data Models & Relationships

### User
```typescript
{
  id: UUID
  username: string
  email: string
  roleId: number (FK → Role)
  regionId: UUID | null (FK → Region)
  areaId: UUID | null (FK → Area)
  territoryId: UUID | null (FK → Territory)
  dealerId: UUID | null (FK → Dealer)
  managerId: UUID | null (FK → User)
  salesGroupId: number | null (FK → SalesGroup)
  isActive: boolean
  isBlocked: boolean
}
```

### Dealer
```typescript
{
  id: UUID
  dealerCode: string (unique)
  businessName: string
  regionId: UUID (FK → Region)
  areaId: UUID (FK → Area)
  territoryId: UUID (FK → Territory)
  managerId: UUID | null (FK → User)
  lat: number
  lng: number
  // ... other fields
}
```

### Order
```typescript
{
  id: UUID
  dealerId: UUID (FK → Dealer)
  orderNumber: string (unique)
  status: "Pending" | "Approved" | "Rejected" | "Processing" | "Shipped" | "Delivered" | "Cancelled"
  approvalStage: string | null // "territory_manager" | "area_manager" | "regional_manager"
  approvalStatus: "pending" | "approved" | "rejected"
  approvedBy: UUID | null
  approvedAt: Date | null
  totalAmount: number
  items: OrderItem[]
}
```

### Invoice
```typescript
{
  id: UUID
  dealerId: UUID (FK → Dealer)
  orderId: UUID | null (FK → Order)
  invoiceNumber: string (unique)
  baseAmount: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  balanceAmount: number
  status: "paid" | "unpaid" | "partial" | "overdue"
  approvalStage: string | null
  approvalStatus: "pending" | "approved" | "rejected"
  // ... other fields
}
```

### Campaign
```typescript
{
  id: UUID
  campaignName: string
  campaignType: "promotion" | "sales_scheme" | "seasonal_offer"
  startDate: Date
  endDate: Date
  targetAudience: Array<{
    type: "all" | "region" | "area" | "territory" | "dealer" | "team" | "staff"
    entityId: UUID
  }>
  discountPercentage: number
  isActive: boolean
  approvalStage: string | null
  approvalStatus: "pending" | "approved" | "rejected"
}
```

---

## Role-Based Access Patterns

### Super Admin
- **Sees:** Everything (no scoping)
- **Can:** Create any user, manage all regions/areas/territories, approve anything
- **Dashboard:** Global summary

### Regional Admin
- **Sees:** Only their region (dealers, orders, invoices, etc.)
- **Can:** Create users in their region, approve regional-level items
- **Dashboard:** Region summary

### Area Manager
- **Sees:** Only their area (dealers, orders, invoices)
- **Can:** Approve at area_manager stage
- **Dashboard:** Area summary

### Territory Manager
- **Sees:** Only their territory
- **Can:** Approve at territory_manager stage
- **Dashboard:** Territory summary

### Dealer Admin
- **Sees:** Own dealer only
- **Can:** Create dealer staff, approve staff orders
- **Dashboard:** Dealer summary

### Dealer Staff
- **Sees:** Own orders/payments only
- **Can:** Create orders, payment requests
- **Dashboard:** Personal summary

---

## Workflow States

### Order Workflow
```
Pending → territory_manager (pending) → area_manager (pending) → regional_manager (pending) → Approved
```

### Invoice Workflow
```
Pending → dealer_admin (pending) → territory_manager (pending) → area_manager (pending) → regional_manager (pending) → regional_admin (pending) → Approved
```

### Payment Workflow
```
Pending → dealer_admin (pending) → territory_manager (pending) → area_manager (pending) → regional_manager (pending) → regional_admin (pending) → Approved
```

### Pricing Workflow
```
Pending → area_manager (pending) → regional_admin (pending) → super_admin (pending) → Approved (product price updated)
```

### Document Workflow
```
Pending → dealer_admin (pending) → territory_manager (pending) → area_manager (pending) → regional_manager (pending) → Approved
```

### Campaign Workflow
```
Pending → area_manager (pending) → regional_admin (pending) → super_admin (pending) → Approved
```

---

## Error Handling

### Standard Error Response
```json
{
  "error": "Error message",
  "details": "Additional details (in development mode)"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

### Permission Denied
```json
{
  "error": "Access Denied — Missing Permission"
}
```

### Scope Denied
```json
{
  "error": "Access denied"
}
```

---

## Feature Toggles

### Available Toggles
- `pricing_approvals` - Enable/disable pricing approval workflow
- `order_flow` - Enable/disable order processing workflow
- `campaigns` - Enable/disable campaign management
- `manager_hierarchy` - Enable/disable manager hierarchy features
- `geo_location_validation` - Enable/disable geo-location dealer validation
- `inventory_auto_adjust` - Enable/disable automatic inventory adjustments

### Usage
Check toggle before showing feature:
```javascript
const response = await fetch('/api/feature-toggles/pricing_approvals');
const toggle = await response.json();
if (toggle.isEnabled) {
  // Show pricing approval UI
}
```

---

## Integration Checklist

### Frontend Setup
- [ ] Configure base API URL
- [ ] Set up JWT token storage (localStorage/sessionStorage)
- [ ] Implement token refresh logic
- [ ] Set up Socket.IO client
- [ ] Create auth context/provider
- [ ] Implement role-based route guards

### Pages to Build
- [ ] Login/Register
- [ ] Super Admin Dashboard
- [ ] Regional Admin Dashboard
- [ ] Manager Dashboard
- [ ] Dealer Dashboard
- [ ] User Management (Super Admin)
- [ ] Dealer Management
- [ ] Order Management & Approval
- [ ] Invoice Management & Approval
- [ ] Payment Management & Approval
- [ ] Document Management & Approval
- [ ] Campaign Management & Analytics
- [ ] Maps (with role-based filtering)
- [ ] Reports (role-specific)
- [ ] Pricing Requests & Approval
- [ ] Inventory Management
- [ ] Notifications Center
- [ ] Tasks/Pending Approvals
- [ ] Feature Toggles (Technical Admin)
- [ ] Team Management

### Key Features
- [ ] Multi-stage approval UI (show current stage, next approvers)
- [ ] Real-time notifications (Socket.IO)
- [ ] Scoped data filtering (automatic based on role)
- [ ] Map integration (Leaflet/Google Maps) with heatmaps
- [ ] PDF generation for invoices
- [ ] Excel/PDF export for reports
- [ ] File upload for documents/payment proofs
- [ ] SLA indicators (show overdue items)
- [ ] Task list with filters by type

---

## Example API Calls

### Create Order (Dealer Staff)
```javascript
const response = await fetch('/api/orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    items: [
      { materialId: 'uuid', qty: 10, unitPrice: 1000 }
    ],
    notes: 'Urgent delivery required'
  })
});
```

### Approve Order (Manager)
```javascript
const response = await fetch(`/api/orders/${orderId}/approve`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'approve'
  })
});
```

### Get Scoped Dealers (Manager)
```javascript
// Automatically scoped - manager only sees their territory
const response = await fetch('/api/dealers', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## Notes

1. **All endpoints are automatically scoped** - Managers only see data in their territory/area/region
2. **Permissions are enforced** - Missing permission returns 403
3. **Multi-stage approvals** - Check `approvalStage` to show correct approver UI
4. **Real-time updates** - Use Socket.IO for live notifications
5. **Pagination** - Most list endpoints support `?page=1&limit=10`
6. **Filtering** - Use query params for date ranges, status, etc.
7. **File uploads** - Use `multipart/form-data` for documents/payment proofs

---

**Last Updated:** 2024-12-11  
**Backend Version:** Complete Vision Implementation

