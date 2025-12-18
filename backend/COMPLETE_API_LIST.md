# Complete API List - Frontend Integration Guide

**Base URL:** `http://localhost:3000/api`  
**Health Check:** `GET http://localhost:3000/health`

---

## 🔐 Authentication

All endpoints (except `/api/auth/*`) require JWT token in header:
```
Authorization: Bearer <token>
```

### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/login` | Login with username/password | No |
| `POST` | `/api/auth/verify-otp` | Verify OTP | No |
| `POST` | `/api/auth/reset-password` | Request password reset | No |
| `POST` | `/api/auth/reset-password-confirm` | Confirm password reset | No |

**Login Request:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Login Response:**
```json
{
  "token": "jwt_token",
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "role": "super_admin",
    "roleId": 1,
    "regionId": "uuid" | null,
    "areaId": "uuid" | null,
    "territoryId": "uuid" | null,
    "dealerId": "uuid" | null
  }
}
```

---

## 👥 User Management

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/admin/users` | List users (scoped by creator's hierarchy) | `users.view` | `super_admin`, `technical_admin`, `regional_admin`, `regional_manager`, `area_manager`, `territory_manager` |
| `GET` | `/api/admin/users/:id` | Get user by ID (scoped by creator's hierarchy) | `users.view` | `super_admin`, `technical_admin`, `regional_admin`, `regional_manager`, `area_manager`, `territory_manager` |
| `POST` | `/api/admin/users` | Create user (hierarchically scoped) | `users.create` | `super_admin`, `technical_admin`, `regional_admin`, `regional_manager`, `area_manager`, `territory_manager` |
| `PUT` | `/api/admin/users/:id` | Update user (hierarchically scoped) | `users.edit` | `super_admin`, `technical_admin`, `regional_admin`, `regional_manager`, `area_manager`, `territory_manager` |
| `PATCH` | `/api/admin/users/:id/role` | Update user role (hierarchically scoped) | `users.edit` | `super_admin`, `technical_admin`, `regional_admin`, `regional_manager`, `area_manager`, `territory_manager` |
| `DELETE` | `/api/admin/users/:id` | Delete user (hierarchically scoped) | `users.edit` | `super_admin`, `technical_admin`, `regional_admin`, `regional_manager`, `area_manager`, `territory_manager` |

**Notes:**
- Super/Technical Admin can manage all users globally.
- Regional/Area/Territory managers can only manage users (or dealer-attached users) inside their own region/area/territory.
- When creating/updating `dealer_admin` / `dealer_staff`, `dealerId` is required and must point to a dealer inside the creator's scope.

**Create User Request:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "roleId": 1,
  "regionId": "uuid",
  "areaId": "uuid",
  "territoryId": "uuid",
  "dealerId": "uuid",
  "managerId": "uuid",
  "salesGroupId": 1
}
```

---

## 🏢 Dealer Management

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/dealers` | List dealers (scoped) | `dealer.view` | All authenticated |
| `GET` | `/api/dealers/profile` | Get dealer profile | `dealer.view` | `dealer_admin`, `dealer_staff` |
| `GET` | `/api/dealers/my-manager` | Get assigned manager | `dealer.view` | `dealer_admin`, `dealer_staff` |
| `GET` | `/api/dealers/assigned` | Get assigned dealers | `dealer.view` | `tm`, `am`, `sm` |
| `GET` | `/api/dealers/:id` | Get dealer by ID | `dealer.view` | All authenticated |
| `POST` | `/api/dealers` | Create dealer | `dealer.create` | `super_admin`, `key_user` |
| `PUT` | `/api/dealers/:id` | Update dealer | `dealer.update` | `super_admin`, `key_user` |
| `PUT` | `/api/dealers/:id/block` | Block dealer | `dealer.update` | `super_admin` |
| `PUT` | `/api/dealers/:id/verify` | Verify dealer | `dealer.update` | `super_admin`, `key_user` |

**Query Parameters:**
- `?page=1&limit=10` - Pagination
- `?regionId=uuid&areaId=uuid&territoryId=uuid` - Filtering

**Create Dealer Request:**
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

---

## 📦 Orders

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `POST` | `/api/orders` | Create order | `orders.create` | `dealer_admin`, `dealer_staff` |
| `GET` | `/api/orders/my` | Get my orders | `orders.view` | `dealer_admin`, `dealer_staff` |
| `GET` | `/api/orders` | List all orders (scoped) | `orders.view` | `dealer_admin`, `regional_manager`, `regional_admin`, `super_admin` |
| `PATCH` | `/api/orders/:id/status` | Update order status | `orders.edit` | `dealer_admin`, `regional_manager`, `regional_admin`, `super_admin` |
| `PATCH` | `/api/orders/:id/approve` | Approve order (multi-stage) | `orders.approve` | `dealer_admin`, `regional_manager`, `regional_admin`, `super_admin` |
| `PATCH` | `/api/orders/:id/reject` | Reject order | `orders.reject` | `dealer_admin`, `regional_manager`, `regional_admin`, `super_admin` |
| `GET` | `/api/orders/:id/workflow` | Get workflow status | `orders.view` | All authenticated |

**Create Order Request:**
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

**Approval Flow:**
```
dealer_staff creates → territory_manager → area_manager → regional_manager → approved
```

---

## 🧾 Invoices

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/invoices` | List invoices (scoped) | `invoices.view` | All authenticated |
| `GET` | `/api/invoices/:id` | Get invoice by ID | `invoices.view` | All authenticated |
| `GET` | `/api/invoices/:id/pdf` | Download invoice PDF | `invoices.view` | All authenticated |
| `POST` | `/api/invoices` | Create invoice | `invoices.create` | `super_admin`, `key_user`, `dealer_staff` |
| `PUT` | `/api/invoices/:id` | Update invoice | `invoices.edit` | `super_admin`, `key_user` |
| `PATCH` | `/api/invoices/:id/approve` | Approve invoice | `invoices.edit` | `dealer_admin`, `territory_manager`, `area_manager`, `regional_manager`, `regional_admin` |
| `PATCH` | `/api/invoices/:id/reject` | Reject invoice | `invoices.edit` | `dealer_admin`, `territory_manager`, `area_manager`, `regional_manager`, `regional_admin` |
| `GET` | `/api/invoices/pending/approvals` | Get pending invoices | `invoices.view` | `dealer_admin`, `territory_manager`, `area_manager`, `regional_manager`, `regional_admin` |
| `GET` | `/api/invoices/:id/workflow` | Get workflow status | `invoices.view` | All authenticated |

**Create Invoice Request:**
```json
{
  "orderId": "uuid",
  "invoiceNumber": "INV-2024-001",
  "baseAmount": 100000,
  "taxAmount": 18000,
  "invoiceDate": "2024-01-15",
  "dueDate": "2024-02-15"
}
```

**Approval Flow:**
```
dealer_staff creates → dealer_admin → territory_manager → area_manager → regional_manager → regional_admin → approved
```

---

## 💰 Payments

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `POST` | `/api/payments/request` | Create payment request | `payments.create` | `dealer_staff` |
| `GET` | `/api/payments/mine` | Get my payments | `payments.view` | `dealer_admin`, `dealer_staff` |
| `GET` | `/api/payments/dealer/pending` | Get dealer pending payments | `payments.view` | `dealer_admin` |
| `GET` | `/api/payments/pending` | Get pending payments | `payments.view` | `dealer_admin`, `finance_admin` |
| `POST` | `/api/payments/dealer/:id/approve` | Approve payment (dealer admin) | `payments.approve` | `dealer_admin` |
| `POST` | `/api/payments/dealer/:id/reject` | Reject payment (dealer admin) | `payments.approve` | `dealer_admin` |
| `POST` | `/api/payments/:id/approve` | Approve payment | `payments.approve` | `dealer_admin`, `finance_admin` |
| `POST` | `/api/payments/:id/reject` | Reject payment | `payments.approve` | `dealer_admin`, `finance_admin` |
| `GET` | `/api/payments/reconcile` | Auto-reconcile payments | `payments.approve` | `finance_admin`, `super_admin` |

**Create Payment Request (multipart/form-data):**
```
invoiceId: uuid
amount: number
paymentMode: "NEFT" | "RTGS" | "CHEQUE" | "CASH"
utrNumber: string
proofFile: File
```

**Approval Flow:**
```
dealer_staff creates → dealer_admin → territory_manager → area_manager → regional_manager → regional_admin → approved
```

---

## 📄 Documents

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/documents` | List documents (scoped) | `documents.view` | All authenticated |
| `POST` | `/api/documents` | Upload document | `documents.upload` | All authenticated |
| `GET` | `/api/documents/:id/download` | Download document | `documents.view` | All authenticated |
| `DELETE` | `/api/documents/:id` | Delete document | `documents.delete` | All authenticated |
| `PATCH` | `/api/documents/:id/status` | Approve/reject document | `documents.approve` | `super_admin`, `territory_manager`, `area_manager` |
| `GET` | `/api/documents/manager` | Get manager documents | `documents.view` | `territory_manager`, `area_manager`, `regional_manager` |

**Upload Document Request (multipart/form-data):**
```
file: File
documentType: "LICENSE" | "GST" | "PAN" | "BANK_STATEMENT" | "OTHER"
description: string
dealerId: uuid (optional, auto-set for dealers)
```

**Approval Flow:**
```
uploaded → dealer_admin → territory_manager → area_manager → regional_manager → approved
```

---

## 🎯 Campaigns

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/campaigns` | List campaigns (scoped) | `campaigns.view` | All authenticated |
| `GET` | `/api/campaigns/active` | Get active campaigns | `campaigns.view` | `dealer_admin`, `territory_manager`, `area_manager`, `super_admin` |
| `GET` | `/api/campaigns/:id` | Get campaign by ID | `campaigns.view` | `dealer_admin`, `territory_manager`, `area_manager`, `super_admin` |
| `GET` | `/api/campaigns/:id/analytics` | Get campaign analytics | `campaigns.view` | `super_admin`, `regional_admin`, `area_manager` |
| `POST` | `/api/campaigns` | Create campaign | `campaigns.create` | `super_admin`, `key_user` |
| `PUT` | `/api/campaigns/:id` | Update campaign | `campaigns.edit` | `super_admin`, `key_user` |
| `DELETE` | `/api/campaigns/:id` | Delete campaign | `campaigns.delete` | `super_admin`, `key_user` |

**Query Parameters:**
- `?page=1&limit=10&isActive=true&campaignType=promotion`

**Create Campaign Request:**
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

---

## 🗺️ Maps

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/maps/dealers` | Get dealer pins (scoped) | `maps.view` | All authenticated |
| `GET` | `/api/maps/heatmap` | Get heatmap data | `maps.heatmap` | All authenticated |
| `GET` | `/api/maps/regions` | Get regions GeoJSON | `maps.regions` | All authenticated |
| `GET` | `/api/maps/territories` | Get territories GeoJSON | `maps.regions` | All authenticated |

**Query Parameters:**
- `/api/maps/dealers?regionId=uuid&territoryId=uuid&start=2024-01-01&end=2024-12-31`
- `/api/maps/heatmap?granularity=dealer|territory|region&start=2024-01-01&end=2024-12-31`
- `/api/maps/territories?regionId=uuid`

---

## 📊 Reports & Dashboards

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/reports/dashboard/super` | Super admin dashboard | `dashboard.view.superadmin` | `super_admin` |
| `GET` | `/api/reports/dashboard/regional` | Regional dashboard | `dashboard.view.regional` | `regional_admin` |
| `GET` | `/api/reports/dashboard/manager` | Manager dashboard | `dashboard.view.manager` | Managers |
| `GET` | `/api/reports/dashboard/dealer` | Dealer dashboard | `dashboard.view.dealer` | `dealer_admin`, `dealer_staff` |
| `GET` | `/api/reports/dealer-performance` | Dealer performance report | `reports.view` | All authenticated |
| `GET` | `/api/reports/account-statement` | Account statement | `reports.view` | All authenticated |
| `GET` | `/api/reports/invoice-register` | Invoice register | `reports.view` | All authenticated |
| `GET` | `/api/reports/credit-debit-notes` | Credit/debit notes | `reports.view` | All authenticated |
| `GET` | `/api/reports/outstanding-receivables` | Outstanding receivables | `reports.view` | All authenticated |
| `GET` | `/api/reports/territory` | Territory report | `reports.view` | All authenticated |
| `GET` | `/api/reports/regional-sales-summary` | Regional sales summary | `reports.view` | `super_admin`, `area_manager`, `territory_manager`, `regional_manager`, `regional_admin` |
| `GET` | `/api/reports/pending-approvals` | Pending approvals | `reports.view` | `super_admin`, `area_manager`, `territory_manager`, `regional_manager`, `regional_admin` |
| `GET` | `/api/reports/admin-summary` | Admin summary | `dashboard.view.superadmin` | `super_admin` |

**Query Parameters:**
- `?startDate=2024-01-01&endDate=2024-12-31`
- `?dealerId=uuid&regionId=uuid`

---

## 💵 Pricing

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `POST` | `/api/pricing/request` | Request price change | `pricing.request` | `dealer_staff`, `dealer_admin`, `area_manager`, `territory_manager`, `regional_manager` |
| `GET` | `/api/pricing` | List pricing updates (scoped) | `pricing.view` | `dealer_staff`, `dealer_admin`, `area_manager`, `territory_manager`, `regional_manager` |
| `GET` | `/api/pricing/summary` | Pricing summary | `pricing.view` | `super_admin` |
| `GET` | `/api/pricing/manager` | Manager pricing requests | `pricing.view` | `area_manager`, `territory_manager`, `regional_manager` |
| `PATCH` | `/api/pricing/:id` | Approve/reject pricing | `pricing.manage` | `dealer_staff`, `dealer_admin`, `area_manager`, `territory_manager`, `regional_manager` |

**Request Price Change:**
```json
{
  "productId": "uuid",
  "oldPrice": 1000,
  "newPrice": 900,
  "reason": "Market competition"
}
```

**Approval Flow:**
```
requested → area_manager → regional_admin → super_admin → approved (product price updated)
```

---

## 📍 Geography (Regions, Areas, Territories)

### Regions

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/regions` | List regions (with areas & dealers) | `regions.view` | All authenticated |
| `POST` | `/api/regions` | Create region | `regions.manage` | `super_admin` |
| `GET` | `/api/regions/:id` | Get region (with areas, territories, dealers) | `regions.view` | All authenticated |
| `PUT` | `/api/regions/:id` | Update region | `regions.manage` | `super_admin` |
| `DELETE` | `/api/regions/:id` | Delete region | `regions.manage` | `super_admin` |
| `GET` | `/api/regions/dashboard/summary` | Regional dashboard summary (for logged-in region) | `dashboard.view.regional` | `regional_admin`, `regional_manager` |
| `GET` | `/api/regions/dashboard/areas` | Region areas (for logged-in region) | `areas.view` | `regional_admin`, `regional_manager` |
| `GET` | `/api/regions/dashboard/approvals` | Region document approvals (pending) | `documents.view` | `regional_admin`, `regional_manager` |

### Areas

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/areas` | List areas | - | All authenticated |
| `POST` | `/api/areas` | Create area | `areas.manage` | All authenticated |
| `GET` | `/api/areas/:id` | Get area | `areas.view` | All authenticated |
| `PUT` | `/api/areas/:id` | Update area | `areas.manage` | All authenticated |
| `DELETE` | `/api/areas/:id` | Delete area | `areas.manage` | All authenticated |
| `GET` | `/api/areas/dashboard/summary` | Area dashboard summary | `dashboard.view.manager` | All authenticated |
| `GET` | `/api/areas/dashboard/dealers` | Area dealers | `dealer.view` | All authenticated |
| `GET` | `/api/areas/dashboard/approvals` | Area approvals | `documents.view` | All authenticated |

### Territories

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/territories` | List territories | - | All authenticated |
| `POST` | `/api/territories` | Create territory | `territories.manage` | All authenticated |
| `GET` | `/api/territories/:id` | Get territory | `territories.view` | All authenticated |
| `PUT` | `/api/territories/:id` | Update territory | `territories.manage` | All authenticated |
| `DELETE` | `/api/territories/:id` | Delete territory | `territories.manage` | All authenticated |

---

## 👔 Teams

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/teams` | List teams (scoped) | `teams.view` | All authenticated |
| `POST` | `/api/teams` | Create team | `teams.manage` | All authenticated |
| `GET` | `/api/teams/:id` | Get team | `teams.view` | All authenticated |
| `PUT` | `/api/teams/:id` | Update team | `teams.manage` | All authenticated |
| `DELETE` | `/api/teams/:id` | Delete team | `teams.manage` | All authenticated |
| `POST` | `/api/teams/:teamId/dealers` | Add dealer to team | `teams.manage` | All authenticated |
| `DELETE` | `/api/teams/:teamId/dealers/:dealerId` | Remove dealer from team | `teams.manage` | All authenticated |

**Create Team Request:**
```json
{
  "name": "Sales Team Alpha",
  "region": "Mumbai",
  "description": "Primary sales team"
}
```

---

## 📦 Inventory

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/inventory/summary` | Get inventory summary | `inventory.view` | `inventory_user`, `super_admin`, `key_user`, `dealer_admin`, `tm` |
| `GET` | `/api/inventory/details` | Get inventory details | `inventory.view` | `inventory_user`, `super_admin` |
| `POST` | `/api/inventory` | Add inventory item | `inventory.manage` | `inventory_user`, `super_admin` |
| `PUT` | `/api/inventory/:id` | Update inventory item | `inventory.manage` | `inventory_user`, `super_admin` |
| `DELETE` | `/api/inventory/:id` | Delete inventory item | `inventory.manage` | `inventory_user`, `super_admin` |
| `GET` | `/api/inventory/export` | Export inventory | `inventory.view` | `inventory_user`, `super_admin`, `key_user` |

**Query Parameters:**
- `/api/inventory/export?format=excel|pdf`

**Add Inventory Item Request:**
```json
{
  "name": "Laptop",
  "plant": "Mumbai",
  "stock": 100,
  "uom": "Units",
  "sapMaterialNumber": "MAT001"
}
```

---

## 📦 Materials

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/materials` | List materials | `inventory.view` | All authenticated |
| `GET` | `/api/materials/:id` | Get material by ID | `inventory.view` | All authenticated |
| `POST` | `/api/materials` | Create material | `inventory.manage` | `super_admin`, `technical_admin`, `inventory_user` |
| `PUT` | `/api/materials/:id` | Update material | `inventory.manage` | `super_admin`, `technical_admin`, `inventory_user` |
| `DELETE` | `/api/materials/:id` | Delete material | `inventory.manage` | `super_admin`, `technical_admin`, `inventory_user` |
| `POST` | `/api/materials/import` | Import materials from Excel | `inventory.manage` | `super_admin`, `technical_admin`, `inventory_user` |
| `GET` | `/api/materials/analytics` | Get material analytics | `inventory.view` | All authenticated |
| `GET` | `/api/materials/alerts` | Get material alerts | `inventory.view` | All authenticated |
| `GET` | `/api/materials/template` | Download import template | `inventory.view` | All authenticated |
| `POST` | `/api/materials/upload-preview` | Upload preview | `inventory.manage` | `super_admin`, `technical_admin`, `inventory_user` |

### Material Groups

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/materials/groups` | List material groups | `materials.view` | All authenticated |
| `POST` | `/api/materials/groups` | Create material group | `materials.manage` | `super_admin`, `technical_admin`, `dealer_admin`, `inventory_user` |
| `POST` | `/api/materials/groups/:id/assign-material` | Assign material to group | `materials.manage` | `super_admin` |

---

## 📦 Products

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/products` | List products | `inventory.view` | All authenticated |

---

## 🔔 Notifications

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/notifications` | List notifications | `notifications.view` | All authenticated |
| `POST` | `/api/notifications` | Create notification | `notifications.send` | All authenticated |
| `PUT` | `/api/notifications/:id/read` | Mark as read | `notifications.view` | All authenticated |
| `PUT` | `/api/notifications/read-all` | Mark all as read | `notifications.view` | All authenticated |
| `DELETE` | `/api/notifications/:id` | Delete notification | `notifications.view` | All authenticated |
| `GET` | `/api/notifications/unread/count` | Get unread count | `notifications.view` | All authenticated |

**Query Parameters:**
- `?page=1&limit=50&unreadOnly=true`

**Response:**
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

---

## ✅ Tasks

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/tasks` | Get my pending tasks | - | All authenticated |

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

## 💬 Messages

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/messages` | List messages | `messages.view` | `territory_manager`, `area_manager`, `super_admin`, `dealer_admin`, `dealer_staff`, `regional_manager`, `regional_admin` |
| `POST` | `/api/messages` | Send message | `messages.send` | `territory_manager`, `area_manager`, `super_admin`, `dealer_admin`, `dealer_staff`, `regional_manager`, `regional_admin` |
| `GET` | `/api/messages/conversation/:partnerId` | Get conversation | `messages.view` | `territory_manager`, `area_manager`, `super_admin`, `dealer_admin`, `dealer_staff`, `regional_manager`, `regional_admin` |
| `PATCH` | `/api/messages/:id/read` | Mark as read | `messages.view` | `territory_manager`, `area_manager`, `super_admin`, `dealer_admin`, `dealer_staff`, `regional_manager`, `regional_admin` |

---

## 💬 Chat

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/chat/allowed-users` | Get users I can message | `messages.view` | All authenticated |
| `GET` | `/api/chat/conversation/:partnerId` | Get conversation | `messages.view` | All authenticated |
| `POST` | `/api/chat/send` | Send message | `messages.send` | All authenticated |
| `PATCH` | `/api/chat/:partnerId/read` | Mark as read | `messages.view` | All authenticated |
| `GET` | `/api/chat/unread-count` | Get unread count | `messages.view` | All authenticated |

---

## ⚙️ Feature Toggles

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/feature-toggles` | List feature toggles | `system.config` | All authenticated |
| `GET` | `/api/feature-toggles/:key` | Get feature toggle | `system.config` | All authenticated |
| `POST` | `/api/feature-toggles` | Create/update toggle | `system.config` | All authenticated |
| `PUT` | `/api/feature-toggles/:key` | Update toggle | `system.config` | All authenticated |

**Create/Update Toggle Request:**
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

## 🔧 Admin

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `POST` | `/api/admin/sla/run` | Run SLA check | - | `super_admin`, `technical_admin` |
| `PUT` | `/api/admin/dealers/:id/block` | Block dealer | - | `super_admin`, `technical_admin` |
| `PUT` | `/api/admin/dealers/:id/verify` | Verify dealer | - | `super_admin`, `technical_admin` |
| `PUT` | `/api/admin/dealers/:id/assign-region` | Assign region | - | `super_admin`, `technical_admin` |
| `POST` | `/api/admin/sales-groups/merge` | Merge sales groups | - | `super_admin`, `technical_admin` |
| `PUT` | `/api/admin/documents/:id/review` | Review document | - | `super_admin`, `technical_admin` |
| `PATCH` | `/api/admin/pricing-updates/:id/review` | Review pricing update | - | `super_admin`, `technical_admin` |
| `GET` | `/api/admin/pricing-updates` | Get pricing updates | - | `super_admin`, `technical_admin` |
| `GET` | `/api/admin/reports` | Get admin reports | - | `super_admin`, `technical_admin` |

---

## 👔 Managers

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/managers/summary` | Manager dashboard summary (scoped) | - | `territory_manager`, `area_manager`, `regional_manager` |
| `GET` | `/api/managers/dealers` | Get dealers assigned to logged-in manager | - | `territory_manager`, `area_manager`, `regional_manager` |
| `GET` | `/api/managers/dealers/:id` | Get dealer under logged-in manager | - | `territory_manager`, `area_manager`, `regional_manager` |
| `GET` | `/api/managers/pricing` | Get pricing requests from dealers under manager | - | `territory_manager`, `area_manager`, `regional_manager` |
| `PATCH` | `/api/managers/pricing/:id/forward` | Forward pricing to admin | - | `territory_manager`, `area_manager`, `regional_manager` |
| `POST` | `/api/managers/assign-dealer` | Assign dealer to manager (hierarchically scoped) | - | `super_admin`, `technical_admin`, `regional_admin`, `regional_manager`, `area_manager`, `territory_manager` |

---

## 📊 Accounts

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/accounts/summary` | Get accounts summary | - | `accounts_user`, `super_admin` |
| `GET` | `/api/accounts/invoices` | Get invoices | - | `accounts_user`, `super_admin` |
| `POST` | `/api/accounts/invoices` | Create invoice | - | `accounts_user`, `super_admin` |
| `PUT` | `/api/accounts/invoices/:id` | Update invoice | - | `accounts_user`, `super_admin` |
| `DELETE` | `/api/accounts/invoices/:id` | Delete invoice | - | `accounts_user`, `super_admin` |
| `GET` | `/api/accounts/notes` | Get notes | - | `accounts_user`, `super_admin` |
| `POST` | `/api/accounts/notes` | Create note | - | `accounts_user`, `super_admin` |
| `PUT` | `/api/accounts/notes/:id` | Update note | - | `accounts_user`, `super_admin` |
| `DELETE` | `/api/accounts/notes/:id` | Delete note | - | `accounts_user`, `super_admin` |
| `GET` | `/api/accounts/statements` | Get statements | - | `accounts_user`, `super_admin` |
| `POST` | `/api/accounts/statements` | Create statement | - | `accounts_user`, `super_admin` |
| `PUT` | `/api/accounts/statements/:id` | Update statement | - | `accounts_user`, `super_admin` |
| `GET` | `/api/accounts/reconciliation` | Get reconciliation | - | `accounts_user`, `super_admin` |

---

## 🔄 Workflow

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `PATCH` | `/api/workflow/:type/:id/approve` | Approve entity | `workflow.approve` | All authenticated |
| `PATCH` | `/api/workflow/:type/:id/reject` | Reject entity | `workflow.reject` | All authenticated |
| `GET` | `/api/workflow/:type/:id/workflow` | Get workflow status | `workflow.view` | All authenticated |

**Types:** `order`, `invoice`, `payment`, `pricing`, `document`, `campaign`

**Example:**
- `PATCH /api/workflow/order/:id/approve`
- `PATCH /api/workflow/invoice/:id/reject`
- `GET /api/workflow/payment/:id/workflow`

---

## 🔐 Roles & Permissions

### Roles

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/roles` | List roles | - | All authenticated |
| `POST` | `/api/roles` | Create role | - | All authenticated |
| `PUT` | `/api/roles/:roleId/permissions` | Update role permissions | - | All authenticated |
| `POST` | `/api/roles/assign-permission` | Assign permission to role | - | All authenticated |

### Permissions

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `GET` | `/api/permissions` | List permissions | - | All authenticated |
| `POST` | `/api/permissions` | Create permission | - | All authenticated |

---

## 🔌 SAP Integration

| Method | Endpoint | Description | Permissions | Roles |
|--------|----------|-------------|-------------|-------|
| `POST` | `/api/sap/sync-dealers` | Sync dealers from SAP | - | `admin` |
| `GET` | `/api/sap/customer-account/:dealerId` | Get customer account | - | All authenticated |
| `GET` | `/api/sap/vendor-account/:dealerId` | Get vendor account | - | All authenticated |
| `POST` | `/api/sap/credit-debit-note` | Create credit/debit note | - | `admin`, `key_user` |
| `POST` | `/api/sap/sync-invoices/:dealerId` | Sync invoices | - | `admin` |

---

## 📡 WebSocket Events

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

#### Chat Events
```javascript
socket.on('send_message', (payload) => {
  // { senderId, recipientId, body, subject }
});

socket.on('receive_message', (message) => { ... });
socket.on('new_message_notification', (data) => { ... });
socket.on('message_sent', (data) => { ... });
socket.on('message_error', (error) => { ... });
```

#### Room Management
```javascript
socket.emit('join_chat', { user1, user2 });
socket.on('joined_room', (data) => { ... });

socket.emit('leave_chat', { user1, user2 });
socket.on('left_room', (data) => { ... });
```

---

## 📝 Common Query Parameters

### Pagination
```
?page=1&limit=10
```

### Date Range
```
?startDate=2024-01-01&endDate=2024-12-31
?start=2024-01-01&end=2024-12-31
```

### Filtering
```
?status=pending&dealerId=uuid&regionId=uuid
?isActive=true&campaignType=promotion
```

### Search
```
?search=keyword
```

---

## 📦 Response Formats

### Success (List)
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "totalPages": 10
}
```

### Success (Single)
```json
{
  "id": "uuid",
  ...
}
```

### Error
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

---

## 🔑 Permission Keys Reference

### User Management
- `users.view`, `users.create`, `users.edit`, `users.suspend`

### Dealer Management
- `dealer.view`, `dealer.create`, `dealer.update`, `dealer.delete`

### Geography
- `regions.view`, `regions.manage`
- `areas.view`, `areas.manage`
- `territories.view`, `territories.manage`

### Orders
- `orders.view`, `orders.create`, `orders.approve`, `orders.reject`, `orders.edit`

### Invoices
- `invoices.view`, `invoices.create`, `invoices.edit`

### Payments
- `payments.view`, `payments.create`, `payments.approve`, `payments.edit`

### Inventory
- `inventory.view`, `inventory.manage`, `inventory.adjust`
- `materials.view`, `materials.manage`

### Documents
- `documents.upload`, `documents.view`, `documents.verify`, `documents.approve`, `documents.delete`

### Pricing
- `pricing.view`, `pricing.request`, `pricing.approve`, `pricing.manage`

### Campaigns
- `campaigns.view`, `campaigns.create`, `campaigns.edit`, `campaigns.delete`, `campaigns.approve`

### Maps
- `maps.view`, `maps.heatmap`, `maps.regions`, `maps.global`

### Reports
- `reports.view`, `reports.create`, `reports.export`

### Messaging
- `messages.view`, `messages.send`

### Notifications
- `notifications.view`, `notifications.send`

### Dashboards
- `dashboard.view.superadmin`
- `dashboard.view.regional`
- `dashboard.view.manager`
- `dashboard.view.dealer`

### Teams
- `teams.view`, `teams.manage`

### Workflow
- `workflow.view`, `workflow.approve`, `workflow.reject`

### System
- `system.logs`, `system.config`, `system.backup`

---

## 🎯 Role Hierarchy

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

## ⚠️ Important Notes

1. **All endpoints are automatically scoped** - Managers only see data in their territory/area/region
2. **Permissions are enforced** - Missing permission returns 403
3. **Multi-stage approvals** - Check `approvalStage` to show correct approver UI
4. **Real-time updates** - Use Socket.IO for live notifications
5. **Pagination** - Most list endpoints support `?page=1&limit=10`
6. **Filtering** - Use query params for date ranges, status, etc.
7. **File uploads** - Use `multipart/form-data` for documents/payment proofs
8. **Health Check** - Use `GET /health` to verify server status

---

**Last Updated:** 2024-12-11  
**Backend Version:** Complete Vision Implementation  
**Total Endpoints:** 150+

