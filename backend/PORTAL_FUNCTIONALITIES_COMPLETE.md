# Dealer Management Portal - Complete Functionalities Documentation

**Last Updated:** January 16, 2026  
**Portal Version:** 1.0.0  
**Backend Stack:** Express.js | PostgreSQL | Sequelize ORM | Socket.io | JWT Authentication

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Features & Modules](#core-features--modules)
3. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
4. [Authentication & Authorization](#authentication--authorization)
5. [Dealer Management System](#dealer-management-system)
6. [Order Management System](#order-management-system)
7. [Invoice & Payment Processing](#invoice--payment-processing)
8. [Inventory Management](#inventory-management)
9. [Workflow & Approval Engine](#workflow--approval-engine)
10. [User & Team Management](#user--team-management)
11. [Geographic & Mapping Features](#geographic--mapping-features)
12. [Reporting & Analytics](#reporting--analytics)
13. [Fleet Management & Driver Tracking](#fleet-management--driver-tracking)
14. [Campaign Management](#campaign-management)
15. [Material & Pricing Management](#material--pricing-management)
16. [Notification & Communication System](#notification--communication-system)
17. [Document Management](#document-management)
18. [Advanced Features](#advanced-features)

---

## System Overview

The **Dealer Management Portal** is a comprehensive enterprise-grade business management system designed to handle complex dealer networks, multi-stage approvals, hierarchical reporting, and geographic tracking. The system supports:

- **Hierarchical User Organization:** Multiple organizational levels from Super Admin to Dealer Staff
- **Multi-Stage Approval Workflows:** Sophisticated approval pipelines for orders, invoices, payments, pricing, documents, and campaigns
- **Role-Based Access Control:** Fine-grained permissions system with 10+ distinct roles
- **Geographic Tracking:** Real-time GPS tracking with fleet management and driver monitoring
- **Financial Management:** Complete invoice and payment processing with Razorpay integration
- **Inventory Management:** Automated stock management with real-time alerts
- **Notification Engine:** Multi-channel notification system with role-targeted broadcasting
- **Audit & Compliance:** Complete audit logging and SLA tracking

---

## Core Features & Modules

### Module Structure

The portal consists of the following core modules:

```
├── Authentication & User Management
├── Dealer Management
├── Order Management
├── Invoice & Payment Processing
├── Inventory Management
├── Workflow & Approval System
├── Notification Engine
├── Team & Organization Management
├── Geographic & Fleet Management
├── Campaign Management
├── Material & Pricing Management
├── Reporting & Analytics
├── Document Management
├── Audit & Compliance
└── Advanced Features (ETA, SLA, Task Management)
```

---

## Role-Based Access Control (RBAC)

### 10-Role Hierarchy System

The system implements a comprehensive 10-role hierarchy with strict permission scoping:

#### 1. **Super Admin**
- **Scope:** Global (entire system)
- **Permissions:** All system permissions
- **Responsibilities:**
  - Manage all technical admins
  - Manage all finance admins
  - Manage all regional admins
  - Approve pricing requests (final level)
  - Approve campaigns (final level)
  - Create and manage super admin users
  - Global reporting and analytics access
  - System-wide configuration and feature toggles
  - Block/unblock dealers globally

#### 2. **Technical Admin**
- **Scope:** Global (system administration)
- **Permissions:** All permissions except finance operations
- **Responsibilities:**
  - Manage all regional admins
  - Manage all users (regional and below)
  - Create regional structures (regions, areas, territories)
  - Assign managers to geographic zones
  - System configuration and debugging
  - Audit log access

#### 3. **Finance Admin**
- **Scope:** Global (all financial operations)
- **Permissions:** Finance and payment-related operations
- **Responsibilities:**
  - Final approval for all payments
  - Global payment reports and reconciliation
  - Revenue tracking across all regions
  - Financial compliance monitoring
  - Payment gateway management

#### 4. **Regional Admin**
- **Scope:** One specific region
- **Permissions:** All permissions within assigned region
- **Responsibilities:**
  - Manage regional managers, area managers, territory managers
  - Create and manage areas within region
  - Create and manage territories within region
  - Assign dealers to territories
  - Final approval for orders/invoices in region
  - Regional reporting and analytics
  - Finance admin-level payment approval for region
  - Approve campaigns within region

#### 5. **Regional Manager**
- **Scope:** One region
- **Permissions:** Regional operational permissions
- **Responsibilities:**
  - Manage all orders and invoices in region
  - Approve/reject orders after territory manager
  - Manage regional teams
  - Coordinate between area managers
  - Regional performance tracking

#### 6. **Area Manager**
- **Scope:** One area (within a region)
- **Permissions:** Area-level operational permissions
- **Responsibilities:**
  - Manage territory managers
  - Approve/reject orders (area-level)
  - Approve pricing requests (middle level)
  - Manage dealers in assigned area
  - Approve campaigns (middle level)
  - Area performance tracking
  - Material requests management

#### 7. **Territory Manager**
- **Scope:** One territory (within an area)
- **Permissions:** Territory operational permissions
- **Responsibilities:**
  - Assign dealers to own territory
  - First-level approval for orders/invoices
  - Approve pricing requests (first level)
  - Manage dealer staff/admins
  - Territory performance tracking
  - Direct dealer interaction and support

#### 8. **Dealer Admin**
- **Scope:** One dealer entity
- **Permissions:** Dealer-level operational permissions
- **Responsibilities:**
  - Create and submit orders
  - Create invoices
  - Manage dealer staff
  - View own dealer profile
  - Submit payment requests
  - Access dealer-specific reports
  - Create documents

#### 9. **Dealer Staff**
- **Scope:** One dealer entity (limited)
- **Permissions:** Limited dealer permissions
- **Responsibilities:**
  - Create orders (as per dealer admin assignment)
  - View dealer information
  - Limited order tracking
  - Create basic documents

#### 10. **Key User** (Special Role)
- **Scope:** Global (special permissions)
- **Permissions:** Dealer creation and verification
- **Responsibilities:**
  - Create new dealers in system
  - Verify dealer information
  - Initial dealer setup
  - One-time dealer onboarding tasks

---

## Authentication & Authorization

### Authentication Methods

#### 1. **JWT-Based Authentication**
- **Token Type:** Bearer token in Authorization header
- **Expires:** Configurable (default: 24 hours)
- **Token Payload:**
  ```json
  {
    "id": "user-uuid",
    "username": "string",
    "email": "string",
    "role": "role_name",
    "roleId": 1,
    "regionId": "uuid-or-null",
    "areaId": "uuid-or-null",
    "territoryId": "uuid-or-null",
    "dealerId": "uuid-or-null"
  }
  ```

#### 2. **Login Endpoint**
- **Endpoint:** `POST /api/auth/login`
- **Request:**
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Response:**
  ```json
  {
    "token": "jwt_token",
    "user": { /* user object */ }
  }
  ```

#### 3. **OTP Verification**
- **Endpoint:** `POST /api/auth/verify-otp`
- **Purpose:** Two-factor authentication for sensitive operations
- **Request:**
  ```json
  {
    "email": "string",
    "otp": "string"
  }
  ```

#### 4. **Password Reset**
- **Request:** `POST /api/auth/reset-password`
- **Confirm:** `POST /api/auth/reset-password-confirm`
- **Features:**
  - Email-based password reset
  - OTP verification
  - Secure password update

### Permission Model

- **Granular Permissions:** 50+ individual permissions
- **Role-Permission Mapping:** Each role has specific permission set
- **Hierarchical Scoping:** Permissions respect organizational hierarchy
- **Dynamic Permission Checking:** Real-time permission validation on every request

---

## Dealer Management System

### Dealer Lifecycle

#### 1. **Dealer Creation**
- **Allowed By:** Super Admin, Key User
- **Endpoint:** `POST /api/dealers`
- **Required Information:**
  ```json
  {
    "dealerCode": "D001",
    "businessName": "ABC Distributors",
    "contactPerson": "John Doe",
    "email": "john@abc.com",
    "phoneNumber": "+91-9876543210",
    "address": "123 Business Street",
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

#### 2. **Dealer Verification**
- **Allowed By:** Super Admin, Key User
- **Endpoint:** `PUT /api/dealers/:id/verify`
- **Purpose:** Mark dealer as verified/active
- **Status Changes:**
  - `pending` → `verified` → `active`
  - `active` → `blocked` (by Super Admin)

#### 3. **Dealer Blocking**
- **Allowed By:** Super Admin only
- **Endpoint:** `PUT /api/dealers/:id/block`
- **Effect:** Dealer cannot create orders, invoices, or payments
- **Reason Logging:** All blocks are logged with reasons

#### 4. **Dealer Profile Management**
- **Endpoint:** `GET /api/dealers/profile`
- **Access:** Dealer Admin, Dealer Staff
- **Information Accessible:**
  - Business details
  - Contact information
  - Geographic location
  - Assigned manager
  - Account status
  - Credit/debit information

#### 5. **Dealer Listing**
- **Endpoint:** `GET /api/dealers`
- **Filtering Options:**
  - By region: `?regionId=uuid`
  - By area: `?areaId=uuid`
  - By territory: `?territoryId=uuid`
  - By manager: `?managerId=uuid`
  - By status: `?status=active|pending|verified|blocked`
- **Pagination:** `?page=1&limit=10`
- **Scoping:**
  - Super/Technical Admin: See all dealers
  - Regional Admin: See dealers in region only
  - Area Manager: See dealers in area only
  - Territory Manager: See dealers in territory only
  - Dealer: See own profile only

#### 6. **Dealer Hierarchy Assignment**
- **Regional Assignment:** Assigned to region by Super/Technical Admin
- **Area Assignment:** Assigned to area by Regional Admin
- **Territory Assignment:** Assigned to territory by Area Manager
- **Manager Assignment:** Territory Manager assigned as dealer manager

#### 7. **Dealer Material Assignment**
- **Purpose:** Define which materials dealer can purchase
- **Endpoint:** `POST /api/dealers/:id/materials`
- **Batch Operations:** Assign multiple materials at once
- **Individual Operations:** Add/remove specific materials

---

## Order Management System

### Order Types

The system handles various order types:
- **Purchase Orders:** Standard material orders from dealers
- **Stock Transfer Orders:** Inter-dealer material transfers
- **Return Orders:** Material returns to warehouse
- **Special Orders:** Custom material orders

### Order Workflow States

```
DRAFT
  ├→ SUBMITTED (submitted by dealer_admin)
  ├→ APPROVED_BY_TERRITORY_MANAGER
  ├→ APPROVED_BY_AREA_MANAGER
  ├→ APPROVED_BY_REGIONAL_MANAGER
  ├→ APPROVED_BY_REGIONAL_ADMIN
  ├→ APPROVED_BY_FINANCE_ADMIN (if payment required)
  ├→ CONFIRMED (ready for fulfillment)
  ├→ IN_TRANSIT
  ├→ DELIVERED
  └→ COMPLETED

  REJECTED (at any stage)
  CANCELLED
```

### Core Order Operations

#### 1. **Order Creation**
- **Allowed By:** Dealer Admin, Dealer Staff
- **Endpoint:** `POST /api/orders`
- **Request Body:**
  ```json
  {
    "items": [
      {
        "materialId": "uuid",
        "qty": 100,
        "unitPrice": 1000
      }
    ],
    "notes": "Urgent order - needed by Friday",
    "deliveryAddress": "optional custom address"
  }
  ```

#### 2. **Order Submission**
- **Transitions Order State:** DRAFT → SUBMITTED
- **Triggers:** First approval workflow stage
- **Notifications:** Sent to territory manager

#### 3. **Multi-Stage Approval**
- **Stage 1:** Territory Manager approval
- **Stage 2:** Area Manager approval
- **Stage 3:** Regional Manager approval
- **Stage 4:** Regional Admin approval
- **Stage 5 (if applicable):** Finance Admin approval for payment verification
- **Final Stage:** System auto-confirms when all stages approved

#### 4. **Order Approval**
- **Endpoint:** `PATCH /api/orders/:id/approve`
- **Request:**
  ```json
  {
    "remarks": "Looks good, approved for next stage"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Order approved and moved to stage: area_manager",
    "order": { /* updated order */ },
    "stage": "area_manager",
    "isFinal": false
  }
  ```

#### 5. **Order Rejection**
- **Endpoint:** `PATCH /api/orders/:id/reject`
- **Request:**
  ```json
  {
    "reason": "Stock not available",
    "remarks": "Will be available next week"
  }
  ```
- **Effect:** Order returns to dealer for revision
- **Notifications:** Sent to dealer admin with rejection reason

#### 6. **Order Tracking**
- **Endpoint:** `GET /api/orders/:id/workflow`
- **Information Provided:**
  - Current workflow stage
  - Approval history with timestamps
  - SLA status for each stage
  - Pending approvals
  - Timeline of actions

#### 7. **My Orders (Dealer View)**
- **Endpoint:** `GET /api/orders/my`
- **Access:** Dealer Admin, Dealer Staff
- **Shows:** All orders created by or accessible to dealer
- **Includes:** Status, approval history, estimated delivery

#### 8. **Orders List (Manager View)**
- **Endpoint:** `GET /api/orders`
- **Scoping:**
  - Shows only orders within user's hierarchy scope
  - Dealers see own orders
  - Territory Managers see all orders in territory
  - Area Managers see all orders in area
  - Regional Managers see all orders in region
  - Finance Admin sees all orders requiring payment approval

#### 9. **Order Status Update**
- **Endpoint:** `PATCH /api/orders/:id/status`
- **Allowed Statuses:**
  - `IN_TRANSIT`: After warehouse dispatch
  - `DELIVERED`: After delivery confirmation
  - `COMPLETED`: Final state after fulfillment
  - `CANCELLED`: Can cancel at draft/rejected stage

### Order Inventory Integration

- **Automatic Stock Deduction:** Stock reduced when order moves to `CONFIRMED`
- **Stock Availability Check:** Validation during order creation
- **Low Stock Alerts:** Alerts when material falls below threshold
- **Inventory Holds:** Stock held during approval workflow
- **Release on Rejection:** Stock released if order is rejected

---

## Invoice & Payment Processing

### Invoice Lifecycle

```
DRAFT
  └→ SUBMITTED
     ├→ APPROVED_BY_TERRITORY_MANAGER
     ├→ APPROVED_BY_AREA_MANAGER
     ├→ APPROVED_BY_REGIONAL_MANAGER
     ├→ APPROVED_BY_REGIONAL_ADMIN
     ├→ READY_FOR_PAYMENT
     ├→ PAYMENT_IN_PROGRESS
     ├→ PAID
     └→ CLOSED

REJECTED (at any stage)
CANCELLED
```

### Invoice Operations

#### 1. **Invoice Creation**
- **Created From:** Order or manual creation
- **Allowed By:** Dealer Admin, Regional Manager, Regional Admin
- **Endpoint:** `POST /api/invoices`
- **Contains:**
  - Order items and quantities
  - Unit prices and totals
  - Taxes and discounts
  - Delivery charges (if applicable)
  - Terms and conditions

#### 2. **Invoice Approval Workflow**
- **Same Multi-Stage Approval as Orders**
- **Final Approver:** Regional Admin or Finance Admin
- **Status:** Transitions to `READY_FOR_PAYMENT` after approval

#### 3. **Payment Request Creation**
- **Endpoint:** `POST /api/payment-requests`
- **Triggers:** After invoice approval
- **Content:**
  - Invoice reference
  - Payment amount
  - Due date
  - Terms (credit days)

#### 4. **Payment Processing**

##### **Payment Gateway Integration (Razorpay)**
- **Provider:** Razorpay Payment Gateway
- **Payment Methods Supported:**
  - Credit Card
  - Debit Card
  - UPI
  - Netbanking
  - Wallets

- **Payment Flow:**
  1. Invoice created and approved
  2. Payment request generated
  3. Payment link sent to dealer
  4. Dealer makes payment via gateway
  5. Payment confirmed and recorded
  6. Invoice marked as `PAID`

#### 5. **Payment Approval Workflow**
- **Stage 1:** Dealer Admin (submits payment request)
- **Stage 2:** Territory Manager (reviews)
- **Stage 3:** Area Manager (reviews)
- **Stage 4:** Regional Manager (reviews)
- **Stage 5:** Regional Admin (reviews)
- **Stage 6:** Finance Admin (final approval)
- **Final:** Payment processed and recorded

#### 6. **Payment Status Tracking**
- **Status States:**
  - `PENDING`: Awaiting dealer payment
  - `IN_PROGRESS`: Payment gateway processing
  - `COMPLETED`: Successfully paid
  - `FAILED`: Payment failed, can retry
  - `CANCELLED`: Payment cancelled by system/user
  - `REFUNDED`: Money returned to dealer

#### 7. **Payment Report**
- **Endpoint:** `GET /api/payments/report`
- **Reports Available:**
  - Daily payment summary
  - Outstanding invoices
  - Paid invoices
  - Failed payments with reasons
  - Regional payment performance

#### 8. **Credit & Debit Notes**
- **Debit Note:** For additional charges
- **Credit Note:** For adjustments/returns
- **Endpoint:** `POST /api/debit-credit-notes`
- **Workflow:** Same approval process as invoices

---

## Inventory Management

### Inventory Tracking

#### 1. **Material Inventory**
- **Tracked At:** Warehouse level
- **Attributes:**
  - Material ID
  - Quantity on hand
  - Quantity reserved (in pending orders)
  - Quantity available for sale
  - Reorder level (threshold)
  - Unit of measure

#### 2. **Stock Levels**
- **Real-Time Updates:**
  - Stock increased: On warehouse receipt
  - Stock decreased: On order confirmation
  - Stock reserved: On order submission
  - Stock released: On order rejection

#### 3. **Inventory Alerts**
- **Low Stock Alert:** Triggered when quantity < reorder level
- **Out of Stock Alert:** Triggered when quantity = 0
- **Expiry Alert:** (if applicable) Material expiry warnings
- **Recipients:** Warehouse staff, Regional Admin, System Admin

#### 4. **Inventory Operations**

##### **Stock Receipt**
- **Endpoint:** `POST /api/inventory/receipt`
- **From:** Supplier/Warehouse transfers
- **Triggers:** Stock increase

##### **Stock Adjustment**
- **Endpoint:** `POST /api/inventory/adjustment`
- **Reasons:** Damage, loss, sample, obsolescence
- **Requires:** Approval and documentation

##### **Material Transfer**
- **Between Warehouses:** Authorized by Regional Admin
- **Endpoint:** `POST /api/inventory/transfer`
- **Tracks:** Origin and destination with timestamps

#### 5. **Inventory Reports**
- **Endpoint:** `GET /api/inventory/report`
- **Reports:**
  - Stock on hand by material
  - Stock by warehouse
  - Low stock items
  - Stock movement history
  - Inventory valuation

#### 6. **Regional Inventory Management**
- **By Region:** Separate inventory tracking per region
- **Material Pricing:** Different prices per region
- **Stock Allocation:** Regional admins can allocate stock to territories

---

## Workflow & Approval Engine

### Enterprise Workflow System

The portal includes a sophisticated, multi-stage approval workflow engine that handles complex business processes across multiple modules.

#### Architecture Components

##### 1. **WorkflowService** (`src/services/workflow/WorkflowService.js`)
- Central orchestration engine
- Methods:
  - `startWorkflow(entity, type)`: Initiates workflow
  - `approve(entity, userId, remarks)`: Moves to next stage
  - `reject(entity, userId, reason)`: Returns to previous or dealer
  - `getWorkflowStatus(entity)`: Gets current stage and history

##### 2. **WorkflowResolver** (`src/services/workflow/WorkflowResolver.js`)
- Stage navigation and validation
- Methods:
  - `getNextStage(currentStage, entityType)`: Determines next stage
  - `getPreviousStage(currentStage)`: Gets previous stage
  - `isFinalStage(stage)`: Checks if stage is final
  - `validateUserCanApprove(user, entity)`: Permission validation

##### 3. **Workflow Pipelines** (`src/services/workflow/pipelines.js`)
- Centralized workflow definitions for each entity type
- Easy to modify without code changes

##### 4. **WorkflowTimeline** Model
- Complete history tracking
- Stores: stage, action, actor, timestamp, remarks, SLA data

### Entity-Specific Pipelines

#### **Order Pipeline**
```
dealer_admin
  ↓ (submits)
territory_manager (approval 1)
  ↓ (approves)
area_manager (approval 2)
  ↓ (approves)
regional_manager (approval 3)
  ↓ (approves)
regional_admin (final)
  ↓ (approves)
CONFIRMED → Fulfillment
```

#### **Invoice Pipeline**
```
dealer_admin
  ↓
territory_manager
  ↓
area_manager
  ↓
regional_manager
  ↓
regional_admin → READY_FOR_PAYMENT
```

#### **Payment Pipeline**
```
dealer_admin
  ↓
territory_manager
  ↓
area_manager
  ↓
regional_manager
  ↓
regional_admin
  ↓
finance_admin (final) → PAYMENT_PROCESSING
```

#### **Pricing Request Pipeline**
```
territory_manager
  ↓
area_manager
  ↓
regional_admin
  ↓
super_admin (final) → APPROVED/ACTIVE
```

#### **Document Pipeline**
```
dealer_admin
  ↓
territory_manager
  ↓
area_manager
  ↓
regional_manager (final) → APPROVED
```

#### **Campaign Pipeline**
```
area_manager
  ↓
regional_admin
  ↓
super_admin (final) → ACTIVE
```

### Workflow API Endpoints

#### **Approve Operation**
- **Endpoint:** `PATCH /api/{type}/:id/approve`
- **Types:** `orders`, `invoices`, `payments`, `pricing`, `documents`, `campaigns`
- **Request:**
  ```json
  {
    "remarks": "Optional approval message"
  }
  ```
- **Response:** Entity with updated workflow status

#### **Reject Operation**
- **Endpoint:** `PATCH /api/{type}/:id/reject`
- **Request:**
  ```json
  {
    "reason": "Required rejection reason",
    "remarks": "Optional additional details"
  }
  ```
- **Effect:** Entity returns to previous stage (or dealer if first stage)

#### **Get Workflow Status**
- **Endpoint:** `GET /api/{type}/:id/workflow`
- **Response:**
  ```json
  {
    "currentStage": "area_manager",
    "isFinal": false,
    "timeline": [
      {
        "stage": "dealer_admin",
        "action": "submitted",
        "actor": "John Doe",
        "timestamp": "2024-01-10T10:30:00Z",
        "remarks": "Initial submission",
        "slaStatus": "on_time",
        "slaHours": 48
      },
      {
        "stage": "territory_manager",
        "action": "approved",
        "actor": "Jane Smith",
        "timestamp": "2024-01-10T11:45:00Z",
        "remarks": "Approved",
        "slaStatus": "on_time",
        "slaHours": 24
      }
    ],
    "pendingApprovals": {
      "stage": "area_manager",
      "dueBy": "2024-01-11T12:00:00Z"
    }
  }
  ```

### SLA & Timeline Management

#### **SLA Tracking**
- **Per Stage SLA:** Each stage has defined SLA hours
- **Automatic Alerts:** Sent when SLA is about to breach
- **Historical Records:** SLA status recorded in timeline
- **Escalation:** Can escalate overdue items

#### **Timeline History**
- **Complete Record:** All actions tracked
- **Immutable:** Cannot be modified after recording
- **Auditable:** Can audit all workflow actions
- **Export:** Available in reports

---

## User & Team Management

### User Management Operations

#### 1. **User Creation**
- **Allowed By:** Super Admin, Technical Admin, Regional Admin, Area Manager, Territory Manager
- **Endpoint:** `POST /api/admin/users`
- **Hierarchical Constraints:**
  - Super Admin can create any user
  - Regional Admin can create regional and below users
  - Area Manager can create area and below users (territory manager, dealers)
  - Territory Manager can create dealers and dealer staff

#### 2. **User Types & Attributes**
- **Username:** Unique identifier
- **Email:** Unique email address
- **Password:** Securely hashed
- **Role:** One of 10 roles defined
- **Hierarchy Reference:**
  - `regionId`: For regional users
  - `areaId`: For area users
  - `territoryId`: For territory users
  - `dealerId`: For dealer users
  - `managerId`: Manager user ID

#### 3. **User Permissions**
- **Endpoint:** `GET /api/admin/users/:id/permissions`
- **Returns:** All permissions for the user's role
- **Used By:** Frontend for UI control

#### 4. **User Role Update**
- **Endpoint:** `PATCH /api/admin/users/:id/role`
- **Allowed:** Super Admin, Technical Admin, Regional Admin (for lower roles)
- **Constraints:** Cannot promote to higher roles than own

#### 5. **User Deactivation**
- **Endpoint:** `DELETE /api/admin/users/:id`
- **Effect:** User cannot login, but records preserved for audit
- **Allowed By:** User's creator or higher authority

#### 6. **User List with Scoping**
- **Endpoint:** `GET /api/admin/users`
- **Scoping Rules:**
  - Super Admin sees all users
  - Technical Admin sees all users
  - Regional Admin sees users in region
  - Area Manager sees users in area
  - Territory Manager sees users in territory
- **Filtering:**
  - By role: `?role=dealer_admin`
  - By status: `?status=active|inactive`
  - By hierarchy: `?regionId=uuid`

### Team Management

#### 1. **Team Structure**
- **Hierarchy:** Region → Area → Territory → Team → Dealers
- **Management Levels:**
  - Regional Teams: Under Regional Manager
  - Area Teams: Under Area Manager
  - Territory Teams: Under Territory Manager

#### 2. **Team Operations**
- **Create Team:** `POST /api/teams`
- **Update Team:** `PUT /api/teams/:id`
- **List Teams:** `GET /api/teams`
- **Add Dealers to Team:** `POST /api/teams/:id/dealers`
- **View Team Performance:** `GET /api/teams/:id/performance`

#### 3. **Team Performance Metrics**
- **Total Orders:** Count of orders in team
- **Total Revenue:** Sum of invoice amounts
- **Outstanding Amount:** Sum of pending payments
- **Active Campaigns:** Campaign participation
- **Dealer Count:** Number of dealers in team
- **Performance Trend:** Month-over-month comparison

#### 4. **Manager Assignment**
- **Direct Report Hierarchy:** Each user has a manager
- **Manager Visibility:** Managers see all subordinates
- **Reporting Chain:** Complete chain from super admin to dealer staff

---

## Geographic & Mapping Features

### GPS Tracking System

#### 1. **Real-Time Location Tracking**
- **For:** Dealers, Trucks, Delivery personnel
- **Update Frequency:** Real-time via Socket.io
- **Data Stored:** TruckLocationHistory table
- **Accuracy:** GPS coordinates with timestamp

#### 2. **Dealer Location Management**
- **Location Data:** Latitude, Longitude during dealer creation
- **Update:** `PATCH /api/dealers/:id/location`
- **Purpose:** Geographic segmentation, route optimization

#### 3. **Maps API Features**

#### **Dealer Pins on Map**
- **Endpoint:** `GET /api/maps/dealers`
- **Features:**
  - Show all dealer locations as pins
  - Cluster pins by territory/area
  - Filter by hierarchy:
    - `?regionId=uuid`
    - `?areaId=uuid`
    - `?territoryId=uuid`
  - Color code by status (active, verified, pending, blocked)
  - Click for dealer details

#### **Heatmap**
- **Endpoint:** `GET /api/maps/heatmap`
- **Shows:** Order concentration by geographic area
- **Filters:**
  - By date range: `?from=date&to=date`
  - By product category
  - By order status

#### **Route Optimization**
- **Endpoint:** `GET /api/maps/route-optimize`
- **Input:** List of delivery points
- **Output:** Optimized route with waypoints

### Fleet Management

#### 1. **Truck Management**
- **Endpoint:** `POST /api/fleet/trucks`
- **Information:**
  - Registration number
  - Capacity (weight, volume)
  - Current location (GPS)
  - Assigned driver
  - Assignment status

#### 2. **Truck Assignment**
- **Endpoint:** `POST /api/fleet/trucks/:id/assign`
- **Workflow:**
  - Assign truck to shipment
  - Assign driver to truck
  - Track assignment history

#### 3. **Driver Management**
- **Endpoint:** `POST /api/fleet/drivers`
- **Information:**
  - Name, Contact, License Number
  - License expiry date
  - Current assignment
  - Performance metrics

#### 4. **Truck Tracking**
- **Real-Time Tracking:** `GET /api/fleet/trucks/:id/location`
- **Route History:** `GET /api/fleet/trucks/:id/history`
- **ETA Calculation:** `GET /api/fleet/trucks/:id/eta`

### ETA Service

#### **ETA Calculation**
- **Based On:**
  - Current location
  - Destination
  - Historical route data
  - Traffic patterns
  - Vehicle speed profile

#### **ETA Updates**
- **Real-Time Updates:** As truck location updates
- **Accuracy:** Machine learning model improvement over time
- **Notification:** Updated ETA sent to dealer when changes >10%

---

## Reporting & Analytics

### Report Types

#### 1. **Sales Reports**
- **Endpoint:** `GET /api/reports/sales`
- **Dimensions:**
  - By region, area, territory, dealer
  - By material/product category
  - By time period (daily, weekly, monthly)
- **Metrics:**
  - Total orders
  - Total revenue
  - Average order value
  - Order growth rate

#### 2. **Revenue Reports**
- **Endpoint:** `GET /api/reports/revenue`
- **Includes:**
  - Gross revenue
  - Collected revenue
  - Outstanding revenue
  - By hierarchy level
  - By time period
  - Year-over-year comparison

#### 3. **Outstanding/Credit Reports**
- **Endpoint:** `GET /api/reports/outstanding`
- **Shows:**
  - Outstanding amount by dealer
  - Outstanding days (aging)
  - Exceeds credit limit alerts
  - Recovery status

#### 4. **Dealer Performance Reports**
- **Endpoint:** `GET /api/reports/dealer-performance`
- **Metrics:**
  - Order frequency
  - Average order value
  - Payment behavior (on-time %, days late)
  - Product mix preferences
  - Growth trend

#### 5. **Territory Reports**
- **Endpoint:** `GET /api/reports/territory`
- **By Territory Manager:**
  - Total dealers in territory
  - Total orders and revenue
  - Top performing dealers
  - Inactive dealers
  - Growth metrics

#### 6. **Area Reports**
- **Endpoint:** `GET /api/reports/area`
- **By Area Manager:**
  - Total territories and dealers
  - Total orders and revenue
  - Territory performance comparison
  - Regional contribution

#### 7. **Regional Reports**
- **Endpoint:** `GET /api/reports/regional`
- **By Regional Admin:**
  - Regional performance summary
  - Area performance breakdown
  - Regional vs national comparison
  - Strategic metrics

#### 8. **Payment Reports**
- **Endpoint:** `GET /api/reports/payments`
- **Includes:**
  - Payments received
  - Payment mode breakdown
  - Collection rate
  - Failed transactions
  - Outstanding invoices

#### 9. **Inventory Reports**
- **Endpoint:** `GET /api/reports/inventory`
- **Includes:**
  - Stock levels by material
  - Stock movement
  - Low stock alerts
  - Slow-moving items
  - Inventory aging

#### 10. **Campaign Reports**
- **Endpoint:** `GET /api/reports/campaigns`
- **Metrics:**
  - Campaign reach
  - Dealer participation
  - ROI
  - Performance by region

### Report Features

- **Scoped Reporting:** Reports respect user hierarchy
- **Export Options:** PDF, Excel, CSV
- **Scheduling:** Automated report generation and email delivery
- **Custom Filters:** Flexible filtering options
- **Drill-Down:** Navigate from summary to detail
- **Comparative Analysis:** Period-over-period comparison
- **Data Visualization:** Charts, graphs, heatmaps

---

## Campaign Management

### Campaign Types

1. **Marketing Campaigns:** Promotional campaigns for products
2. **Sales Campaigns:** Sales target and incentive campaigns
3. **Loyalty Campaigns:** Dealer loyalty and reward programs
4. **Seasonal Campaigns:** Time-limited special campaigns

### Campaign Lifecycle

```
DRAFT
  ↓
SUBMITTED
  ↓
APPROVED_BY_AREA_MANAGER
  ↓
APPROVED_BY_REGIONAL_ADMIN
  ↓
APPROVED_BY_SUPER_ADMIN (final)
  ↓
ACTIVE (eligible for participation)
  ↓
COMPLETED (ended)

REJECTED (at any stage)
CANCELLED
```

### Campaign Operations

#### 1. **Campaign Creation**
- **Allowed By:** Area Manager, Regional Admin
- **Endpoint:** `POST /api/campaigns`
- **Information:**
  ```json
  {
    "name": "Q1 Sales Drive",
    "description": "Increase sales in Q1",
    "startDate": "2024-01-01",
    "endDate": "2024-03-31",
    "targetRegions": ["uuid1", "uuid2"],
    "targetDealers": ["uuid1", "uuid2"],
    "budget": 100000,
    "incentiveStructure": {
      "tier1": { "target": 100000, "reward": 5000 },
      "tier2": { "target": 150000, "reward": 10000 }
    }
  }
  ```

#### 2. **Campaign Approval**
- **Endpoint:** `PATCH /api/campaigns/:id/approve`
- **Workflow:** Area Manager → Regional Admin → Super Admin
- **Result:** Campaign moves to ACTIVE state

#### 3. **Dealer Participation**
- **Endpoint:** `POST /api/campaigns/:id/participate`
- **Dealer Action:** Opt-in to campaign
- **Tracking:** Participation tracked and eligible for incentives

#### 4. **Campaign Metrics**
- **Endpoint:** `GET /api/campaigns/:id/metrics`
- **Tracked:**
  - Participating dealers count
  - Total sales under campaign
  - Incentive disbursement
  - Performance vs target
  - Regional performance breakdown

#### 5. **Campaign Completion**
- **Endpoint:** `PATCH /api/campaigns/:id/complete`
- **Process:**
  - Calculate incentives
  - Mark participants for payment
  - Generate final report
  - Archive campaign

---

## Material & Pricing Management

### Material Catalog

#### 1. **Material Groups**
- **Hierarchical Organization:** Group → Material Type → Material
- **Endpoint:** `GET /api/material-groups`
- **Examples:** Cement, Steel, Sand, Aggregates, Chemicals

#### 2. **Materials**
- **Endpoint:** `GET /api/materials`
- **Attributes:**
  - Code, Name, Description
  - Category/Group
  - Unit of measure
  - Base price
  - Stock level
  - Reorder point

#### 3. **Regional Pricing**
- **Different Prices by Region:** Managed separately
- **Model:** RegionMaterial table stores regional overrides
- **Endpoint:** `GET /api/materials/:id/pricing`
- **Price List by Region:**
  - Base price (national)
  - Regional markup/discount
  - Effective price for dealers in region

### Pricing Update Management

#### 1. **Pricing Request Creation**
- **Initiated By:** Territory Manager, Area Manager
- **Endpoint:** `POST /api/pricing-updates`
- **Request Content:**
  ```json
  {
    "materials": [
      {
        "materialId": "uuid",
        "currentPrice": 1000,
        "proposedPrice": 1100,
        "reason": "Cost increase"
      }
    ],
    "effectiveDate": "2024-02-01",
    "justification": "Market rate adjustment"
  }
  ```

#### 2. **Pricing Approval Workflow**
- **Endpoint:** `PATCH /api/pricing-updates/:id/approve`
- **Approval Chain:**
  1. Territory Manager (submitter if area manager)
  2. Area Manager
  3. Regional Admin
  4. Super Admin (final approval)
- **Timeline:** Must track approval timeline

#### 3. **Price Effective Date**
- **Future Dating:** Prices effective on specified date
- **Communication:** Dealers notified before effective date
- **List Price Updates:** Master prices updated automatically

#### 4. **Pricing History**
- **Endpoint:** `GET /api/materials/:id/price-history`
- **Shows:** All price changes with dates and approvers
- **Audit Trail:** Complete traceability

#### 5. **Material Assignment to Dealers**
- **Endpoint:** `POST /api/dealers/:id/materials`
- **Determines:** Which materials dealer can order
- **Customization:** Can restrict material availability per dealer

---

## Notification & Communication System

### Notification Engine

#### 1. **Notification Types**

##### **Workflow Notifications**
- Order/Invoice/Payment status changes
- Approval pending notifications
- Rejection notifications with reason
- SLA breach alerts

##### **Inventory Notifications**
- Low stock alerts
- Out of stock alerts
- Stock transfer notifications

##### **User Notifications**
- New user creation
- Role changes
- Permission changes

##### **Payment Notifications**
- Payment request created
- Payment reminder
- Payment confirmation
- Failed payment alerts

##### **Campaign Notifications**
- Campaign activation
- Participation opportunity
- Performance updates
- Incentive notifications

#### 2. **Notification Delivery**

##### **In-App Notifications**
- **Real-Time:** Via Socket.io
- **Storage:** Notification table
- **Read Status:** Marked as read when viewed
- **Popup:** Immediate display for critical alerts

##### **Email Notifications**
- **Service:** Nodemailer
- **Template:** HTML email templates
- **Scheduling:** Configurable send times
- **Retry:** Automatic retry on failure

##### **Push Notifications**
- **Platform:** Browser push or mobile app
- **Opt-In:** User preference settings

#### 3. **Role-Targeted Broadcasting**

**Example:** Order Approval Notification
```javascript
// Sent to all territory managers having this order
// Plus all area managers above them
// Plus regional admin
// Automatically targeted by RBAC engine
```

#### 4. **Notification Preferences**
- **Endpoint:** `PUT /api/users/:id/notification-preferences`
- **Preferences:**
  - Workflow notifications: on/off
  - Daily digest: on/off
  - Email notifications: on/off
  - Frequency: Real-time / Daily / Weekly

#### 5. **Notification History**
- **Endpoint:** `GET /api/notifications`
- **Filtering:**
  - By type: `?type=workflow,inventory,payment`
  - By status: `?status=read,unread`
  - By date: `?from=date&to=date`

---

## Document Management

### Document Types

1. **Purchase Orders:** System-generated from orders
2. **Invoices:** System-generated from orders
3. **Delivery Notes:** Generated on shipment
4. **Receipt Notes:** Generated on delivery
5. **Custom Documents:** User-uploaded documents

### Document Operations

#### 1. **Document Upload**
- **Endpoint:** `POST /api/documents/upload`
- **Allowed By:** Dealer Admin, Territory Manager and above
- **File Types:** PDF, Word, Excel, Images
- **Size Limit:** 50 MB per file
- **Storage:** Secure cloud storage (AWS S3 or similar)

#### 2. **Document Workflow**
- **Status:** DRAFT → SUBMITTED → APPROVED → ACTIVE
- **Approval Chain:** Same as other workflows
- **Endpoint:** `PATCH /api/documents/:id/approve`

#### 3. **Document Access Control**
- **By Role:** Only relevant roles can access
- **By Hierarchy:** Only users within scope
- **Audit Log:** All document access logged

#### 4. **Document Retrieval**
- **Endpoint:** `GET /api/documents/:id/download`
- **Return:** File with appropriate headers
- **Logging:** Access logged for compliance

#### 5. **Document Archive**
- **Retention:** Configurable retention policy
- **Archival:** Old documents moved to archive storage
- **Retrieval:** Can retrieve archived documents

---

## Advanced Features

### Task Management

#### 1. **Task Creation**
- **From Workflows:** Auto-generated tasks for approvers
- **Manual Tasks:** Created by managers
- **Endpoint:** `POST /api/tasks`
- **Assignment:** Auto-assigned to responsible user

#### 2. **Task Tracking**
- **Endpoint:** `GET /api/tasks`
- **Status:** TODO → IN_PROGRESS → COMPLETED
- **Priority:** Low, Medium, High, Critical
- **Due Date:** With reminder notifications

#### 3. **Task Dashboard**
- **Endpoint:** `GET /api/tasks/dashboard`
- **Shows:**
  - My pending tasks
  - Tasks by priority
  - Overdue tasks
  - Team tasks (if manager)

### SLA Management

#### 1. **SLA Configuration**
- **Per Stage:** Each workflow stage has SLA hours
- **Example:** Territory Manager: 24 hours
- **Global Setting:** Configurable in system settings

#### 2. **SLA Monitoring**
- **Endpoint:** `GET /api/sla/status`
- **Alerts:** When SLA is about to breach
- **Escalation:** Automatic escalation after breach

#### 3. **SLA Metrics**
- **On-Time %:** Percentage of items approved on-time
- **Average Time:** Average time per stage
- **Bottlenecks:** Stages with high delays
- **By User:** Individual approver SLA metrics

### Audit & Compliance

#### 1. **Audit Logging**
- **What's Logged:**
  - User login/logout
  - CRUD operations on all entities
  - Workflow actions
  - Role and permission changes
  - Document access
  - Payment transactions

#### 2. **Audit Report**
- **Endpoint:** `GET /api/audit-logs`
- **Filters:**
  - By user: `?userId=uuid`
  - By action: `?action=create,update,delete`
  - By entity: `?entity=orders,invoices`
  - By date range: `?from=date&to=date`

#### 3. **Access Control Audit**
- **Track:** Who accessed what and when
- **Data Sensitivity:** Extra logging for sensitive data
- **Compliance:** Maintain compliance requirements

### Goods Receipt & Railway Receipt

#### 1. **Goods Receipt (GR)**
- **Purpose:** Receive materials from supplier
- **Endpoint:** `POST /api/goods-receipts`
- **Process:**
  - Link to purchase order
  - Receive items
  - Verify quantity and quality
  - Update inventory

#### 2. **Railway Receipt**
- **For:** Materials arriving via railway
- **Endpoint:** `POST /api/railway-receipts`
- **Tracking:**
  - Rake number
  - Car number
  - Receipt date
  - Unloading date

### Rake Arrival Management

#### 1. **Rake Arrival Notification**
- **Endpoint:** `POST /api/rake-arrivals`
- **Information:**
  - Train/Rake number
  - Expected materials
  - Estimated arrival
  - Destination warehouse

#### 2. **Rake Tracking**
- **Endpoint:** `GET /api/rake-arrivals/:id`
- **Status:**
  - In Transit
  - Arrived
  - Unloading
  - Completed

### Account Statements

#### 1. **Dealer Account Statement**
- **Endpoint:** `GET /api/accounts/statement/:dealerId`
- **Shows:**
  - Invoices issued
  - Payments received
  - Debit/credit notes
  - Outstanding balance
  - Statement period

#### 2. **Export Options**
- **Formats:** PDF, Excel, CSV
- **Period:** Custom date range

### Scanned Logs

#### 1. **Document Scanning Integration**
- **Purpose:** Track scanned/uploaded documents
- **Endpoint:** `POST /api/scanned-logs`
- **Logged Data:**
  - Document name
  - Upload time
  - Uploader
  - File size
  - File type

---

## System Architecture & Technology Stack

### Backend Stack

- **Framework:** Express.js 5.1.0
- **Database:** PostgreSQL with Sequelize ORM
- **Authentication:** JWT (JSON Web Tokens)
- **Real-Time Communication:** Socket.io 4.8.1
- **Payment Gateway:** Razorpay 2.9.6
- **File Processing:** ExcelJS, xlsx
- **PDF Generation:** PDFKit
- **Email:** Nodemailer
- **Security:** Helmet, CORS, Rate Limiting
- **Logging:** Winston
- **Testing:** Jest
- **Environment Management:** dotenv

### Database Models (41 tables)

Core Models:
- `User`, `Role`, `RolePermission`, `Permission`
- `Region`, `Area`, `Territory`, `SalesGroup`
- `Dealer`, `UserDealer`, `DealerMaterial`
- `Order`, `OrderItem`, `Invoice`, `PaymentRequest`
- `Material`, `MaterialGroup`, `RegionMaterial`
- `Inventory`, `DealerMaterial`
- `Campaign`, `Truck`, `TruckAssignment`
- `Document`, `Notification`, `AuditLog`
- `WorkflowTimeline`, `Message`
- `Warehouse`, `GoodsReceipt`, `RailwayReceipt`, `RakeArrival`
- `AccountStatement`, `ScannedLog`
- `FeatureToggle`, `CreditDebitNote`
- `PricingUpdate`, `Product`, `TruckLocationHistory`

### API Endpoints (100+ endpoints)

Organized by modules:
- Authentication (4 endpoints)
- User Management (6 endpoints)
- Dealer Management (8 endpoints)
- Orders (8 endpoints)
- Invoices (8 endpoints)
- Payments (6 endpoints)
- Inventory (6 endpoints)
- Materials (4 endpoints)
- Pricing (4 endpoints)
- Campaigns (6 endpoints)
- Workflows (3 endpoints per entity type)
- Maps & Fleet (6 endpoints)
- Reports (10+ endpoints)
- Teams (6 endpoints)
- Documents (6 endpoints)
- Notifications (4 endpoints)
- Audit (2 endpoints)

### Security Measures

1. **Authentication:** JWT with expiry
2. **Authorization:** RBAC with hierarchical scoping
3. **Encryption:** Bcryptjs for passwords
4. **HTTPS:** All communication encrypted
5. **CORS:** Configured for frontend domain
6. **Rate Limiting:** Prevent brute force attacks
7. **Input Validation:** Express-validator on all inputs
8. **SQL Injection Prevention:** Sequelize parameterized queries
9. **Helmet:** HTTP headers security
10. **Audit Logging:** All sensitive operations logged

---

## Deployment & Configuration

### Environment Variables

```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secret-key
JWT_EXPIRE=24h
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
NODEMAILER_USER=your-email@gmail.com
NODEMAILER_PASS=your-app-password
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=ap-south-1
PORT=3000
NODE_ENV=production
```

### Database Initialization

```bash
npm install
sequelize-cli db:create
sequelize-cli db:migrate
npm run seed
```

### Running the Server

```bash
npm start          # Production
npm run dev        # Development with nodemon
npm run test       # Run tests
```

---

## Summary

The Dealer Management Portal is a comprehensive, enterprise-grade system designed to manage complex dealer networks with sophisticated workflow automation, hierarchical access control, geographic tracking, and financial integration. With 10 distinct roles, 100+ API endpoints, multi-stage approval workflows, real-time notifications, and advanced reporting capabilities, it provides a complete solution for dealer and supply chain management.

**Key Strengths:**
- ✅ Hierarchical organization with strict scoping
- ✅ Multi-stage approval workflows
- ✅ Real-time notifications and tracking
- ✅ Comprehensive reporting and analytics
- ✅ Geographic and fleet management
- ✅ Financial integration with payment gateway
- ✅ Complete audit and compliance
- ✅ Scalable and maintainable architecture
- ✅ Role-based access control
- ✅ Enterprise-grade security

---

**Document Generated:** January 16, 2026  
**For Questions or Updates:** Refer to individual feature documentation files