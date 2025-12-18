# Complete Endpoint Reference - Quick Lookup

## 🔐 Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `POST /api/auth/logout` - Logout

## 👥 Users
- `GET /api/admin/users` - List users (scoped by actor's hierarchy – global for super/technical admin; region/area/territory for managers)
- `GET /api/admin/users/:id` - Get user (hierarchically scoped)
- `POST /api/admin/users` - Create user (hierarchically scoped; dealer roles require in-scope dealer)
- `PUT /api/admin/users/:id` - Update user (hierarchically scoped)
- `PATCH /api/admin/users/:id/role` - Update role (hierarchically scoped)
- `DELETE /api/admin/users/:id` - Delete user (hierarchically scoped)

## 🏢 Dealers
- `GET /api/dealers` - List (scoped)
- `GET /api/dealers/:id` - Get dealer
- `POST /api/dealers` - Create (super_admin, key_user)
- `PUT /api/dealers/:id` - Update
- `PUT /api/dealers/:id/block` - Block dealer
- `PUT /api/dealers/:id/verify` - Verify dealer
- `GET /api/dealers/my-manager` - Get assigned manager (dealer_admin, dealer_staff)
- `GET /api/dealers/assigned` - Get assigned dealers (managers)

## 📦 Orders
- `POST /api/orders` - Create (dealer_admin, dealer_staff)
- `GET /api/orders/my` - My orders (dealer_admin, dealer_staff)
- `GET /api/orders` - List all (scoped)
- `PATCH /api/orders/:id/status` - Update status
- `PATCH /api/orders/:id/approve` - Approve (multi-stage)
- `PATCH /api/orders/:id/reject` - Reject

## 🧾 Invoices
- `GET /api/invoices` - List (scoped)
- `GET /api/invoices/:id` - Get invoice
- `GET /api/invoices/:id/pdf` - Download PDF
- `POST /api/invoices` - Create (super_admin, key_user, dealer_staff)
- `PUT /api/invoices/:id` - Update (super_admin, key_user)
- `POST /api/invoices/:id/approve` - Approve/reject (multi-stage)
- `GET /api/invoices/pending/approvals` - Pending invoices

## 💰 Payments
- `POST /api/payments/request` - Create request (multipart/form-data)
- `GET /api/payments/mine` - My payments
- `GET /api/payments/pending` - Pending (finance_admin)
- `GET /api/payments/dealer/pending` - Dealer pending (dealer_admin)
- `POST /api/payments/:id/approve` - Approve
- `POST /api/payments/:id/reject` - Reject
- `GET /api/payments/reconcile` - Auto-reconcile

## 📄 Documents
- `GET /api/documents` - List (scoped)
- `POST /api/documents` - Upload (multipart/form-data)
- `GET /api/documents/:id/download` - Download
- `DELETE /api/documents/:id` - Delete
- `PATCH /api/documents/:id/status` - Approve/reject
- `GET /api/documents/manager` - Manager documents

## 🎯 Campaigns
- `GET /api/campaigns` - List (scoped by targetAudience)
- `GET /api/campaigns/active` - Active campaigns
- `GET /api/campaigns/:id` - Get campaign
- `GET /api/campaigns/:id/analytics` - Analytics (super_admin, regional_admin, area_manager)
- `POST /api/campaigns` - Create (super_admin, key_user)
- `PUT /api/campaigns/:id` - Update
- `DELETE /api/campaigns/:id` - Delete

## 🗺️ Maps
- `GET /api/maps/dealers` - Dealer pins (scoped)
- `GET /api/maps/heatmap` - Heatmap data (?granularity=dealer|territory|region)
- `GET /api/maps/regions` - Regions GeoJSON
- `GET /api/maps/territories` - Territories GeoJSON (?regionId=uuid)

## 📊 Reports
- `GET /api/reports/dashboard/super` - Super admin dashboard
- `GET /api/reports/dashboard/regional` - Regional dashboard
- `GET /api/reports/dashboard/manager` - Manager dashboard
- `GET /api/reports/dashboard/dealer` - Dealer dashboard
- `GET /api/reports/dealer-performance` - Dealer performance
- `GET /api/reports/account-statement` - Account statement
- `GET /api/reports/invoice-register` - Invoice register
- `GET /api/reports/credit-debit-notes` - Credit/debit notes
- `GET /api/reports/outstanding-receivables` - Outstanding
- `GET /api/reports/territory` - Territory report
- `GET /api/reports/regional-sales-summary` - Regional summary
- `GET /api/reports/pending-approvals` - Pending approvals
- `GET /api/reports/admin-summary` - Admin summary

## 💵 Pricing
- `POST /api/pricing/request` - Request price change
- `GET /api/pricing` - List (scoped)
- `GET /api/pricing/summary` - Summary (super_admin)
- `GET /api/pricing/manager` - Manager requests
- `GET /api/pricing/pending` - Pending requests
- `PATCH /api/pricing/:id` - Approve/reject

## 📍 Geography
- `GET /api/regions` - List regions
- `POST /api/regions` - Create region (super_admin)
- `GET /api/regions/:id` - Get region (with areas, territories, dealers)
- `PUT /api/regions/:id` - Update region
- `DELETE /api/regions/:id` - Delete region
- `GET /api/regions/dashboard/summary` - Regional dashboard (for logged-in region)
- `GET /api/regions/dashboard/areas` - Region areas
- `GET /api/regions/dashboard/approvals` - Region approvals

- `GET /api/areas` - List areas
- `POST /api/areas` - Create
- `GET /api/areas/:id` - Get area
- `PUT /api/areas/:id` - Update
- `DELETE /api/areas/:id` - Delete
- `GET /api/areas/dashboard/summary` - Area dashboard
- `GET /api/areas/dashboard/dealers` - Area dealers
- `GET /api/areas/dashboard/approvals` - Area approvals

- `GET /api/territories` - List territories
- `POST /api/territories` - Create
- `GET /api/territories/:id` - Get territory
- `PUT /api/territories/:id` - Update
- `DELETE /api/territories/:id` - Delete

## 👔 Teams
- `GET /api/teams` - List teams
- `POST /api/teams` - Create (teams.manage)
- `GET /api/teams/:id` - Get team
- `PUT /api/teams/:id` - Update
- `DELETE /api/teams/:id` - Delete
- `POST /api/teams/:teamId/dealers` - Add dealer to team
- `DELETE /api/teams/:teamId/dealers/:dealerId` - Remove dealer

## 📦 Inventory
- `GET /api/inventory/summary` - Summary (scoped)
- `GET /api/inventory/details` - Details (inventory_user, super_admin)
- `POST /api/inventory` - Add item
- `PUT /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item
- `GET /api/inventory/export` - Export (?format=excel|pdf)

## 📦 Materials
- `GET /api/materials` - List materials
- `GET /api/materials/:id` - Get material
- `POST /api/materials` - Create (super_admin, technical_admin, inventory_user)
- `PUT /api/materials/:id` - Update
- `DELETE /api/materials/:id` - Delete
- `POST /api/materials/import` - Import from Excel
- `GET /api/materials/analytics` - Analytics
- `GET /api/materials/alerts` - Alerts (expiry, reorder)
- `GET /api/materials/template` - Download template

## 📦 Products
- `GET /api/products` - List products

## 🔔 Notifications
- `GET /api/notifications` - List (notifications.view)
- `POST /api/notifications` - Create (notifications.send)
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete
- `GET /api/notifications/unread/count` - Unread count

## ✅ Tasks
- `GET /api/tasks` - My pending tasks (all roles)

## 💬 Messages
- `GET /api/messages` - List messages
- `POST /api/messages` - Send message
- `GET /api/messages/conversation/:partnerId` - Get conversation
- `PATCH /api/messages/:id/read` - Mark as read

## 💬 Chat
- `GET /api/chat/allowed-users` - Get users I can message
- `GET /api/chat/conversation/:partnerId` - Get conversation
- `POST /api/chat/send` - Send message
- `PATCH /api/chat/:partnerId/read` - Mark as read
- `GET /api/chat/unread-count` - Unread count

## ⚙️ Feature Toggles
- `GET /api/feature-toggles` - List (system.config)
- `GET /api/feature-toggles/:key` - Get toggle
- `POST /api/feature-toggles` - Create/update
- `PUT /api/feature-toggles/:key` - Update

## 🔧 Admin
- `POST /api/admin/sla/run` - Run SLA check (super_admin, technical_admin)
- `PUT /api/admin/dealers/:id/block` - Block dealer
- `PUT /api/admin/dealers/:id/verify` - Verify dealer
- `PUT /api/admin/dealers/:id/assign-region` - Assign region
- `POST /api/admin/sales-groups/merge` - Merge sales groups
- `PUT /api/admin/documents/:id/review` - Review document
- `PATCH /api/admin/pricing-updates/:id/review` - Review pricing
- `GET /api/admin/reports` - Admin reports

## 👔 Managers
- `GET /api/managers/summary` - Manager summary
- `GET /api/managers/dealers` - Assigned dealers
- `GET /api/managers/dealers/:id` - Get dealer
- `GET /api/managers/pricing` - Pricing requests
- `PATCH /api/managers/pricing/:id/forward` - Forward pricing
- `POST /api/managers/assign-dealer` - Assign dealer (super_admin, key_user)

---

## Permission Keys Reference

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

### Documents
- `documents.upload`, `documents.view`, `documents.verify`, `documents.approve`

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

### System
- `system.logs`, `system.config`, `system.backup`

---

## Query Parameters Common Patterns

### Pagination
```
?page=1&limit=10
```

### Date Range
```
?startDate=2024-01-01&endDate=2024-12-31
```

### Filtering
```
?status=pending&dealerId=uuid&regionId=uuid
```

### Search
```
?search=keyword
```

---

## Response Formats

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
  "error": "Error message"
}
```

---

**All endpoints require authentication except `/api/auth/*`**

