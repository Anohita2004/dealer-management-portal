# Complete Frontend Implementation Prompt for Dealer Management Portal

## Overview

You need to build a complete React frontend application that integrates with our fully-implemented backend API. The backend includes a comprehensive multi-stage approval workflow engine, RBAC system, real-time notifications, hierarchical data scoping, and complete business modules.

**Backend API Base URL:** `http://localhost:3000/api`  
**WebSocket URL:** `http://localhost:3000`  
**Framework:** React (with React Router, hooks, context API)

---

## Critical Requirements - Do Not Skip

### 1. Multi-Stage Approval Workflow Engine Integration

The backend has a complete workflow engine that handles approvals for 6 entity types: **Orders**, **Invoices**, **Payments**, **Pricing Requests**, **Documents**, and **Campaigns**.

#### Pipeline Definitions

Each entity type has its own approval pipeline:

**Orders, Invoices, Payments:**
```
dealer_admin → territory_manager → area_manager → regional_manager → regional_admin
```

**Pricing Requests, Campaigns:**
```
area_manager → regional_admin → super_admin
```

**Documents:**
```
dealer_admin → territory_manager → area_manager → regional_manager
```

#### Required Workflow Components

**1. WorkflowTimeline Component**
- Display complete approval history
- Show: stage, action (submitted/approved/rejected), actor, timestamp, remarks, SLA timestamps
- Visual timeline with status indicators
- Show rejection reasons when applicable

**2. WorkflowStatus Component**
- Display current stage in pipeline
- Show completed stages (green/checkmark)
- Show pending stages (gray/pending)
- Show current stage (highlighted/active)
- Display SLA expiration countdown
- Show "Overdue" badge if SLA exceeded

**3. ApprovalActions Component**
- Approve button (only visible if user's role matches current stage)
- Reject button (only visible if user's role matches current stage)
- Remarks/notes input field
- Rejection reason input (required for reject)
- Disable buttons if user cannot approve at current stage
- Show 403 error message if unauthorized attempt

**4. WorkflowProgressBar Component**
- Visual progress bar showing pipeline stages
- Color-coded: completed (green), current (blue), pending (gray), rejected (red)
- Stage labels formatted nicely (e.g., "Territory Manager" instead of "territory_manager")
- Clickable stages to show details

#### API Integration for Workflow

**Approve Entity:**
```javascript
PATCH /api/orders/:id/approve
PATCH /api/invoices/:id/approve
PATCH /api/payments/:id/approve
PATCH /api/pricing/:id/approve
PATCH /api/documents/:id/approve
PATCH /api/campaigns/:id/approve

// Or unified endpoint:
PATCH /api/workflow/:type/:id/approve

Body: { "remarks": "Optional approval remarks" }

Response: {
  "success": true,
  "message": "Approved and moved to stage: territory_manager",
  "order": { ... },
  "stage": "territory_manager",
  "isFinal": false
}
```

**Reject Entity:**
```javascript
PATCH /api/orders/:id/reject
// ... same pattern for all entity types

Body: {
  "reason": "Required rejection reason",
  "remarks": "Optional additional remarks"
}

Response: {
  "success": true,
  "message": "Entity rejected",
  "order": { ... },
  "reason": "Required rejection reason"
}
```

**Get Workflow Status:**
```javascript
GET /api/orders/:id/workflow
// ... same pattern for all entity types

Response: {
  "success": true,
  "workflow": {
    "entityType": "order",
    "entityId": "uuid",
    "pipeline": ["dealer_admin", "territory_manager", ...],
    "currentStage": "territory_manager",
    "completedStages": ["dealer_admin"],
    "pendingStages": ["area_manager", "regional_manager", "regional_admin"],
    "isFinal": false,
    "approvalStatus": "pending",
    "approvedBy": null,
    "approvedAt": null,
    "rejectionReason": null,
    "currentSlaExpiresAt": "2024-12-13T10:00:00Z",
    "timeline": [
      {
        "id": "uuid",
        "stage": "dealer_admin",
        "action": "submitted",
        "actor": { "id": "uuid", "username": "user123", "email": "user@example.com" },
        "remarks": "Workflow started at stage: dealer_admin",
        "rejectionReason": null,
        "timestamp": "2024-12-12T10:00:00Z",
        "slaStart": "2024-12-12T10:00:00Z",
        "slaEnd": "2024-12-13T10:00:00Z"
      },
      {
        "id": "uuid",
        "stage": "dealer_admin",
        "action": "approved",
        "actor": { ... },
        "remarks": "Approved at stage: dealer_admin",
        "timestamp": "2024-12-12T11:00:00Z",
        "slaStart": "2024-12-12T10:00:00Z",
        "slaEnd": "2024-12-12T11:00:00Z"
      }
    ]
  }
}
```

#### Workflow Integration Points

**1. Entity Creation Pages**
- When creating Order/Invoice/Payment/Pricing/Document/Campaign, workflow automatically starts
- Show workflow status immediately after creation
- Display "Pending Approval" status

**2. Entity Detail Pages**
- Always show WorkflowStatus component
- Show WorkflowTimeline component
- Show ApprovalActions component (if user can approve)
- Auto-refresh workflow status on approval/rejection

**3. Entity List Pages**
- Show approval stage badge on each item
- Show SLA countdown/overdue indicator
- Filter by approval status (pending/approved/rejected)
- Sort by SLA expiration (urgent first)

**4. Approval Queue Pages**
- Separate page: `/approvals`
- Show all pending items for current user's role
- Group by entity type (Orders, Invoices, etc.)
- Show stage and SLA for each item
- Quick approve/reject actions

---

### 2. Role-Based Access Control (RBAC) Integration

The backend enforces strict role-based access. Frontend must:

**1. Route Protection**
- Create `ProtectedRoute` component
- Check user role before rendering
- Redirect to `/unauthorized` if role doesn't match
- Support multiple roles: `requiredRoles={['super_admin', 'regional_admin']}`

**2. Permission-Based Feature Access**
- Check permissions via API: `GET /api/permissions/check?permission=orders.create`
- Hide/show UI elements based on permissions
- Disable buttons if user lacks permission

**3. Role Hierarchy Awareness**
- Super Admin: sees everything, can override
- Regional Admin: sees only their region
- Area Manager: sees only their area
- Territory Manager: sees only their territory
- Dealer Admin: sees only their dealer
- Dealer Staff: sees only their own data

**4. Scoped Data Display**
- Backend automatically scopes data - frontend just displays
- Show scope indicator: "Viewing: Region North" or "Viewing: Territory T-001"
- Allow Super Admin to switch scope (if needed)

---

### 3. Real-Time Updates via Socket.IO

**Setup:**
```javascript
import { io } from 'socket.io-client';

const socket = io(WS_URL, {
  auth: { token: localStorage.getItem('token') }
});

socket.on('authenticated', () => {
  console.log('Socket authenticated');
});

socket.on('notification', (notification) => {
  // Add to notification list
  // Show toast notification
  // Update notification badge count
});

socket.on('workflow:stage_transition', (data) => {
  // Refresh workflow status for entity
  // Update entity list if open
});

socket.on('workflow:approved', (data) => {
  // Show success message
  // Refresh entity status
  // Update lists
});

socket.on('workflow:rejected', (data) => {
  // Show rejection notification
  // Refresh entity status
  // Update lists
});
```

**Integration Points:**
- Notification bell with unread count
- Real-time approval status updates
- Auto-refresh entity lists when workflow changes
- Toast notifications for workflow events

---

### 4. Complete Module Implementation

#### Orders Module

**Pages Required:**
1. **Order List** (`/orders`)
   - Table with: order number, dealer, amount, status, approval stage, SLA
   - Filters: status, approval status, date range
   - Actions: View, Approve (if can), Reject (if can)

2. **Order Detail** (`/orders/:id`)
   - Order information
   - Order items table
   - WorkflowStatus component
   - WorkflowTimeline component
   - ApprovalActions component
   - Status history

3. **Create Order** (`/orders/create`)
   - Material selector
   - Quantity inputs
   - Total calculation
   - Submit button (triggers workflow start)

4. **Approval Queue** (`/orders/approvals`)
   - List of orders pending at user's stage
   - Quick approve/reject actions
   - Bulk actions (if needed)

#### Invoices Module

**Pages Required:**
1. **Invoice List** (`/invoices`)
   - Table with: invoice number, dealer, amount, status, approval stage
   - Filters and actions similar to orders

2. **Invoice Detail** (`/invoices/:id`)
   - Invoice information
   - Payment history
   - Workflow components
   - Download PDF button

3. **Create Invoice** (`/invoices/create`)
   - Link to order (optional)
   - Amount inputs
   - Submit for approval

#### Payments Module

**Pages Required:**
1. **Payment List** (`/payments`)
   - Table with payment requests
   - Status, approval stage, amount

2. **Payment Detail** (`/payments/:id`)
   - Payment information
   - Proof file download
   - Workflow components

3. **Create Payment Request** (`/payments/create`)
   - Invoice selector
   - Amount input
   - Proof file upload
   - Submit for approval

#### Pricing Module

**Pages Required:**
1. **Pricing Request List** (`/pricing`)
   - Table with pricing requests
   - Old price vs new price
   - Approval stage

2. **Pricing Request Detail** (`/pricing/:id`)
   - Product information
   - Price change details
   - Workflow components

3. **Create Pricing Request** (`/pricing/request`)
   - Product selector
   - New price input
   - Reason field
   - Submit for approval

#### Documents Module

**Pages Required:**
1. **Document List** (`/documents`)
   - Table with documents
   - Document type, status, approval stage

2. **Document Detail** (`/documents/:id`)
   - Document preview/download
   - Workflow components

3. **Upload Document** (`/documents/upload`)
   - File upload
   - Document type selector
   - Submit for approval

#### Campaigns Module

**Pages Required:**
1. **Campaign List** (`/campaigns`)
   - Table with campaigns
   - Status, approval stage, dates

2. **Campaign Detail** (`/campaigns/:id`)
   - Campaign information
   - Target audience display
   - Analytics
   - Workflow components

3. **Create Campaign** (`/campaigns/create`)
   - Campaign details form
   - Target audience selector (region/area/territory/dealer/team/all)
   - Submit for approval

---

### 5. Dashboard Implementation

**Role-Specific Dashboards:**

**Super Admin Dashboard** (`/dashboard/super`)
- Global KPIs: Total Dealers, Total Invoices, Outstanding Amount, Pending Approvals
- Region breakdown chart
- Active campaigns widget
- Recent approvals timeline
- Map view (all regions)
- Pending approvals by type

**Regional Admin Dashboard** (`/dashboard/regional`)
- Region KPIs (scoped to their region)
- Dealers in region
- Pending approvals in region
- Region performance chart

**Manager Dashboard** (`/dashboard/manager`)
- Territory/Area KPIs
- Dealers under management
- Pending approvals
- Campaign performance

**Dealer Admin Dashboard** (`/dashboard/dealer`)
- Dealer KPIs
- Pending orders
- Outstanding payments
- Campaign performance

**Dealer Staff Dashboard** (`/dashboard/staff`)
- Own orders
- Own payments
- Pending tasks

**Dashboard Features:**
- Real-time data updates
- Date range filters
- Export to PDF/Excel
- Draggable/reorderable widgets
- Refresh button

---

### 6. Task Management Integration

**Task List Component:**
```javascript
GET /api/tasks

Response: {
  "tasks": [
    {
      "id": "uuid",
      "type": "order",
      "title": "Order ORD-123 requires approval",
      "entityId": "uuid",
      "dealerName": "ABC Dealer",
      "createdAt": "2024-12-12T10:00:00Z",
      "stage": "territory_manager",
      "priority": "high",
      "isOverdue": false,
      "slaHours": 48,
      "hoursElapsed": 12,
      "actionUrl": "/orders/uuid"
    }
  ],
  "total": 15,
  "overdue": 3,
  "byType": {
    "order": 5,
    "invoice": 4,
    "payment": 3,
    "document": 2,
    "pricing": 1
  },
  "byPriority": {
    "urgent": 2,
    "high": 5,
    "normal": 8
  }
}
```

**Task List Page** (`/tasks`)
- Show all pending tasks for user
- Group by type
- Sort by priority and SLA
- Quick action buttons (Approve/Reject)
- Filter by type, priority, overdue

**Task Indicators:**
- Badge on navigation showing total tasks
- Overdue count in red
- Urgent tasks highlighted

---

### 7. Notification System

**Notification API:**
```javascript
GET /api/notifications
PATCH /api/notifications/:id/read
DELETE /api/notifications/:id
```

**Notification Component:**
- Notification bell with unread count
- Dropdown list of notifications
- Mark as read on click
- Navigate to related entity
- Real-time updates via Socket.IO

**Notification Types:**
- Workflow: stage assigned, approved, rejected
- Task: new task assigned, task overdue
- System: campaign started, payment received

---

### 8. Maps Integration

**Map API:**
```javascript
GET /api/maps/dealers
GET /api/maps/heatmap?granularity=region
GET /api/maps/regions
```

**Map Component Features:**
- Dealer pins (automatically scoped by user role)
- Region boundaries overlay
- Heatmap overlay (toggle)
- Click dealer pin → show details modal
- Cluster markers for many dealers
- Filter by date range

**Implementation:**
- Use React Leaflet or similar
- Show only dealers user has access to (backend scopes)
- Color-code pins by status
- Show dealer info on click

---

### 9. Reports & Analytics

**Report API:**
```javascript
GET /api/reports/dashboard/super
GET /api/reports/dashboard/regional
GET /api/reports/sales?startDate=&endDate=
GET /api/reports/outstanding
```

**Report Pages:**
- Dashboard widgets (KPI cards, charts)
- Sales reports with filters
- Outstanding reports
- Performance reports
- Export to PDF/Excel

**Charts Required:**
- Line charts for trends
- Bar charts for comparisons
- Pie charts for distributions
- Use Chart.js, Recharts, or similar

---

### 10. User Management

**User API:**
```javascript
GET /api/admin/users
POST /api/admin/users
PUT /api/admin/users/:id
DELETE /api/admin/users/:id
```

**User Management Pages:**
- User list with filters
- Create user form (role-based fields)
- Edit user form
- Assign to region/area/territory/dealer
- Assign manager
- Assign to sales team

**Role-Based Form Fields:**
- Super Admin: all fields available
- Regional Admin: only region-scoped fields
- Conditional fields based on selected role

---

### 11. Campaign Management

**Campaign API:**
```javascript
GET /api/campaigns
POST /api/campaigns
GET /api/campaigns/:id/analytics
```

**Campaign Features:**
- Create campaign with targeting
- Target audience selector (multi-select):
  - All dealers
  - Specific region(s)
  - Specific area(s)
  - Specific territory(ies)
  - Specific dealer(s)
  - Specific team(s)
- Campaign analytics dashboard
- Approval workflow integration

---

### 12. File Upload/Download

**File Upload:**
- Document upload (PDF, images)
- Payment proof upload
- Use multipart/form-data

**File Download:**
- Invoice PDF download
- Document download
- Report export (PDF/Excel)

---

## Technical Implementation Requirements

### 1. API Service Layer

Create a centralized API service:

```javascript
// services/api.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

class ApiService {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token expired, redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
      return;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Workflow methods
  async approveEntity(type, id, remarks) {
    return this.request(`/${type}s/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ remarks }),
    });
  }

  async rejectEntity(type, id, reason, remarks) {
    return this.request(`/${type}s/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason, remarks }),
    });
  }

  async getWorkflowStatus(type, id) {
    return this.request(`/${type}s/${id}/workflow`);
  }

  // Entity methods
  async getOrders() { return this.request('/orders'); }
  async getOrder(id) { return this.request(`/orders/${id}`); }
  async createOrder(data) { return this.request('/orders', { method: 'POST', body: JSON.stringify(data) }); }
  
  // ... similar for invoices, payments, pricing, documents, campaigns
}
```

### 2. State Management

**Use Context API for:**
- Authentication state (user, token)
- Notification state
- Socket.IO connection

**Use React Query or SWR for:**
- Entity data fetching
- Automatic refetching
- Cache management

**Example:**
```javascript
// hooks/useWorkflow.js
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';

export const useWorkflowStatus = (type, id) => {
  return useQuery(
    ['workflow', type, id],
    () => api.getWorkflowStatus(type, id),
    { refetchInterval: 30000 } // Refetch every 30 seconds
  );
};

export const useApproveEntity = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ type, id, remarks }) => api.approveEntity(type, id, remarks),
    {
      onSuccess: (data, variables) => {
        // Invalidate queries to refetch
        queryClient.invalidateQueries(['workflow', variables.type, variables.id]);
        queryClient.invalidateQueries([variables.type + 's']);
      },
    }
  );
};
```

### 3. Error Handling

**Global Error Handler:**
```javascript
// components/ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('Error:', error, errorInfo);
    // Log to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

**API Error Handling:**
- 401: Redirect to login
- 403: Show "Permission Denied" message
- 404: Show "Not Found" message
- 500: Show "Server Error" message
- Network errors: Show "Connection Error" message

### 4. Loading States

- Show loading spinners during API calls
- Skeleton screens for better UX
- Optimistic updates for approvals/rejections

### 5. Form Validation

- Client-side validation before submission
- Show validation errors inline
- Disable submit button until valid

---

## UI/UX Requirements

### 1. Design System

- Consistent color scheme
- Role-based color coding:
  - Pending: Yellow/Orange
  - Approved: Green
  - Rejected: Red
  - Overdue: Red with warning icon

### 2. Responsive Design

- Mobile-friendly (at least tablet support)
- Responsive tables (scroll or card view on mobile)
- Touch-friendly buttons

### 3. Accessibility

- Keyboard navigation
- Screen reader support
- ARIA labels
- Focus management

### 4. Performance

- Lazy load routes
- Code splitting
- Image optimization
- Debounce search inputs
- Virtual scrolling for long lists

---

## Testing Requirements

### Unit Tests
- API service methods
- Utility functions
- Component rendering

### Integration Tests
- Workflow approval flow
- Role-based access
- Real-time updates

### E2E Tests
- Complete approval workflow
- User login and navigation
- Entity creation and approval

---

## File Structure Recommendation

```
src/
├── components/
│   ├── workflow/
│   │   ├── WorkflowStatus.jsx
│   │   ├── WorkflowTimeline.jsx
│   │   ├── ApprovalActions.jsx
│   │   └── WorkflowProgressBar.jsx
│   ├── common/
│   │   ├── DataTable.jsx
│   │   ├── LoadingSpinner.jsx
│   │   ├── ErrorMessage.jsx
│   │   └── ProtectedRoute.jsx
│   └── ...
├── pages/
│   ├── orders/
│   │   ├── OrderList.jsx
│   │   ├── OrderDetail.jsx
│   │   └── CreateOrder.jsx
│   ├── invoices/
│   ├── payments/
│   ├── pricing/
│   ├── documents/
│   ├── campaigns/
│   └── dashboard/
├── services/
│   ├── api.js
│   ├── socket.js
│   └── auth.js
├── hooks/
│   ├── useWorkflow.js
│   ├── useNotifications.js
│   ├── useAuth.js
│   └── ...
├── context/
│   ├── AuthContext.jsx
│   ├── NotificationContext.jsx
│   └── SocketContext.jsx
├── utils/
│   ├── formatDate.js
│   ├── formatCurrency.js
│   └── roleHelpers.js
└── App.jsx
```

---

## Critical Implementation Checklist

### Phase 1: Foundation
- [ ] Set up React app with routing
- [ ] Implement authentication (login/logout)
- [ ] Create API service layer
- [ ] Set up Socket.IO connection
- [ ] Create protected routes
- [ ] Implement role-based navigation

### Phase 2: Workflow Engine
- [ ] Create WorkflowStatus component
- [ ] Create WorkflowTimeline component
- [ ] Create ApprovalActions component
- [ ] Create WorkflowProgressBar component
- [ ] Integrate workflow API calls
- [ ] Add real-time workflow updates
- [ ] Implement SLA countdown/overdue indicators

### Phase 3: Core Modules
- [ ] Orders module (list, detail, create, approvals)
- [ ] Invoices module (list, detail, create, approvals)
- [ ] Payments module (list, detail, create, approvals)
- [ ] Pricing module (list, detail, create, approvals)
- [ ] Documents module (list, detail, upload, approvals)
- [ ] Campaigns module (list, detail, create, approvals)

### Phase 4: Advanced Features
- [ ] Dashboard implementation (role-specific)
- [ ] Task management integration
- [ ] Notification system
- [ ] Maps integration
- [ ] Reports and analytics
- [ ] User management
- [ ] File upload/download

### Phase 5: Polish
- [ ] Error handling and validation
- [ ] Loading states
- [ ] Responsive design
- [ ] Accessibility
- [ ] Performance optimization
- [ ] Testing

---

## API Endpoints Reference

### Workflow Endpoints
- `PATCH /api/orders/:id/approve` - Approve order
- `PATCH /api/orders/:id/reject` - Reject order
- `GET /api/orders/:id/workflow` - Get workflow status
- Same pattern for: invoices, payments, pricing, documents, campaigns
- Unified: `PATCH /api/workflow/:type/:id/approve`, `PATCH /api/workflow/:type/:id/reject`, `GET /api/workflow/:type/:id/workflow`

### Entity Endpoints
- `GET /api/orders` - List orders (scoped)
- `GET /api/orders/:id` - Get order detail
- `POST /api/orders` - Create order
- Same pattern for all entity types

### Other Endpoints
- `GET /api/tasks` - Get user tasks
- `GET /api/notifications` - Get notifications
- `GET /api/maps/dealers` - Get dealer map data
- `GET /api/reports/dashboard/:role` - Get dashboard data
- `GET /api/admin/users` - User management

---

## Real-Time Events

Listen for these Socket.IO events:
- `notification` - New notification
- `workflow:stage_transition` - Entity moved to next stage
- `workflow:approved` - Entity fully approved
- `workflow:rejected` - Entity rejected
- `order:created` - New order created
- `invoice:created` - New invoice created
- Similar events for other entity types

---

## Success Criteria

The frontend implementation is complete when:

1. ✅ All 6 entity types have full CRUD with workflow integration
2. ✅ Workflow components display correctly on all entity detail pages
3. ✅ Approval/rejection works with proper role validation
4. ✅ Real-time updates work via Socket.IO
5. ✅ Role-based access is enforced on all routes
6. ✅ Data is automatically scoped (no manual filtering needed)
7. ✅ Dashboards show role-appropriate data
8. ✅ Task list displays pending approvals
9. ✅ Notifications work in real-time
10. ✅ Maps show scoped dealer data
11. ✅ All forms have validation
12. ✅ Error handling is comprehensive
13. ✅ Mobile-responsive design
14. ✅ Performance is optimized

---

## Additional Resources

- **Backend API Documentation:** See `API_DOCUMENTATION.md`
- **Workflow Engine Documentation:** See `WORKFLOW_ENGINE_DOCUMENTATION.md`
- **Frontend Integration Guide:** See `FRONTEND_INTEGRATION_GUIDE.md`
- **Socket.IO Docs:** https://socket.io/docs/v4/
- **React Router:** https://reactrouter.com/
- **React Query:** https://tanstack.com/query/latest

---

**This is a production-ready backend. Build a production-ready frontend that matches its capabilities.**

**Start with the workflow engine integration - it's the core feature that differentiates this system.**

