# Complete Workflow Engine Documentation

## Overview

This is a comprehensive, enterprise-grade multi-stage approval workflow engine that works across all business modules: **Orders**, **Invoices**, **Payments**, **Pricing Requests**, **Documents**, and **Campaigns**.

## Architecture

### Core Components

1. **WorkflowService** (`src/services/workflow/WorkflowService.js`)
   - Central service handling all workflow operations
   - Methods: `startWorkflow`, `approve`, `reject`, `getWorkflowStatus`

2. **WorkflowResolver** (`src/services/workflow/WorkflowResolver.js`)
   - Resolves stage navigation and validates user permissions
   - Methods: `getNextStage`, `getPreviousStage`, `isFinalStage`, `validateUserCanApprove`

3. **Pipelines** (`src/services/workflow/pipelines.js`)
   - Defines approval pipelines for each entity type
   - Centralized configuration for easy modification

4. **WorkflowTimeline** (`src/models/WorkflowTimeline.js`)
   - Complete history tracking for all workflow actions
   - Stores: stage, action, actor, remarks, SLA timestamps

## Pipeline Definitions

### Order Pipeline
```
dealer_admin → territory_manager → area_manager → regional_manager → regional_admin
```

### Invoice Pipeline
```
dealer_admin → territory_manager → area_manager → regional_manager → regional_admin
```

### Payment Pipeline
```
dealer_admin → territory_manager → area_manager → regional_manager → regional_admin → finance_admin
```

### Pricing Pipeline
```
territory_manager → area_manager → regional_admin → super_admin
```

### Document Pipeline
```
dealer_admin → territory_manager → area_manager → regional_manager
```

### Campaign Pipeline
```
area_manager → regional_admin → super_admin
```

## API Endpoints

### For All Entity Types

#### Approve Entity
```
PATCH /:type/:id/approve
```
**Body:**
```json
{
  "remarks": "Optional approval remarks"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Approved and moved to stage: territory_manager",
  "order": { ... },
  "stage": "territory_manager",
  "isFinal": false
}
```

#### Reject Entity
```
PATCH /:type/:id/reject
```
**Body:**
```json
{
  "reason": "Required rejection reason",
  "remarks": "Optional additional remarks"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Entity rejected",
  "order": { ... },
  "reason": "Required rejection reason"
}
```

#### Get Workflow Status
```
GET /:type/:id/workflow
```

**Response:**
```json
{
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
        "actor": {
          "id": "uuid",
          "username": "user123",
          "email": "user@example.com"
        },
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

### Module-Specific Endpoints

#### Orders
- `PATCH /orders/:id/approve`
- `PATCH /orders/:id/reject`
- `GET /orders/:id/workflow`

#### Invoices
- `PATCH /invoices/:id/approve`
- `PATCH /invoices/:id/reject`
- `GET /invoices/:id/workflow`

#### Payments
- `PATCH /payments/:id/approve`
- `PATCH /payments/:id/reject`
- `GET /payments/:id/workflow`

#### Pricing
- `PATCH /pricing/:id/approve`
- `PATCH /pricing/:id/reject`
- `GET /pricing/:id/workflow`

#### Documents
- `PATCH /documents/:id/approve`
- `PATCH /documents/:id/reject`
- `GET /documents/:id/workflow`

#### Campaigns
- `PATCH /campaigns/:id/approve`
- `PATCH /campaigns/:id/reject`
- `GET /campaigns/:id/workflow`

## Usage Examples

### Starting a Workflow

When creating a new entity, the workflow is automatically started:

```javascript
const { WorkflowService } = require('./services/workflow');

// In your controller
const order = await Order.create({ ... });
await WorkflowService.startWorkflow('order', order, req.user);
```

### Approving an Entity

```javascript
const { WorkflowService } = require('./services/workflow');

const result = await WorkflowService.approve(
  'order',
  order,
  req.user,
  { remarks: 'Looks good' }
);

if (result.isFinal) {
  // Entity is fully approved
  console.log('Order fully approved!');
} else {
  // Moved to next stage
  console.log(`Moved to stage: ${result.currentStage}`);
}
```

### Rejecting an Entity

```javascript
const { WorkflowService } = require('./services/workflow');

const result = await WorkflowService.reject(
  'order',
  order,
  req.user,
  { 
    reason: 'Insufficient stock',
    remarks: 'Please check inventory',
    rollback: true // Automatically rollback any changes
  }
);
```

### Getting Workflow Status

```javascript
const { WorkflowService } = require('./services/workflow');

const status = await WorkflowService.getWorkflowStatus('order', order);

console.log('Current stage:', status.currentStage);
console.log('Completed stages:', status.completedStages);
console.log('Pending stages:', status.pendingStages);
console.log('Timeline:', status.timeline);
```

## Role Validation

The workflow engine enforces strict role-based validation:

- **Only users whose role matches the current stage can approve/reject**
- **Super Admin can override** (configurable)
- **403 Forbidden** is returned if user doesn't have permission

### Example Validation Flow

1. Order is at `dealer_admin` stage
2. Only users with role `dealer_admin` can approve
3. If `territory_manager` tries to approve → **403 Forbidden**
4. After approval, moves to `territory_manager` stage
5. Now only `territory_manager` users can approve

## SLA Tracking

Each stage has an SLA (Service Level Agreement) timestamp:

- **SLA Hours by Entity Type:**
  - Orders: 48 hours
  - Invoices: 48 hours
  - Payments: 36 hours
  - Documents: 24 hours
  - Pricing: 24 hours
  - Campaigns: 24 hours

- **SLA Tracking:**
  - `slaStart`: When stage started
  - `slaEnd`: When stage completed or SLA expired
  - `currentSlaExpiresAt`: When current stage SLA expires

## Timeline History

The `WorkflowTimeline` model stores complete history:

- Every stage transition
- Every approval/rejection
- Actor information
- Remarks and rejection reasons
- SLA timestamps

## Notifications & Tasks

### Automatic Notifications

The workflow engine automatically triggers notifications:

1. **Stage Assigned**: When entity moves to a new stage
2. **Approved**: When entity is approved (stage transition or final)
3. **Rejected**: When entity is rejected
4. **Overdue**: When SLA is exceeded

### Task Management

Tasks are automatically created/closed:

1. **Task Created**: When entity enters a new stage
2. **Task Closed**: When stage is approved/rejected
3. **All Tasks Closed**: When entity is rejected

## Rollback Logic

When an entity is rejected, the workflow engine can automatically rollback:

- **Orders**: Restore stock if it was reserved
- **Invoices**: Handle credit/debit notes
- **Other entities**: Custom rollback logic can be added

## Database Schema

### WorkflowTimeline Table

```sql
CREATE TABLE workflow_timelines (
  id UUID PRIMARY KEY,
  entityType ENUM('order', 'invoice', 'payment', 'pricing', 'document', 'campaign'),
  entityId UUID NOT NULL,
  stage VARCHAR NOT NULL,
  action ENUM('submitted', 'approved', 'rejected'),
  actorId UUID REFERENCES Users(id),
  remarks TEXT,
  rejectionReason TEXT,
  slaStart TIMESTAMP,
  slaEnd TIMESTAMP,
  metadata JSONB,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### Entity Fields Added

All entity models now include:

- `approvalStage`: Current stage in pipeline
- `approvalStatus`: 'pending', 'approved', 'rejected'
- `approvedBy`: User ID who last approved/rejected
- `approvedAt`: Timestamp of last approval/rejection
- `rejectionReason`: Reason for rejection (if rejected)
- `currentSlaExpiresAt`: When current stage SLA expires

## Migration

Run migrations to set up the database:

```bash
# Create WorkflowTimeline table
npx sequelize-cli db:migrate --name 20251212000001-create-workflow-timeline

# Add currentSlaExpiresAt to all entities
npx sequelize-cli db:migrate --name 20251212000002-add-current-sla-expires-at
```

## Error Handling

The workflow engine throws descriptive errors:

- **403 Forbidden**: User doesn't have permission for current stage
- **400 Bad Request**: Entity already approved/rejected
- **404 Not Found**: Entity not found
- **500 Internal Server Error**: Unexpected errors

## Best Practices

1. **Always use transactions** when calling workflow methods
2. **Check `isFinal`** after approval to handle final approval differently
3. **Provide meaningful remarks** for audit trail
4. **Handle rollback** appropriately for each entity type
5. **Monitor SLA** timestamps for overdue items

## Extending the Workflow

### Adding a New Entity Type

1. **Add pipeline** in `src/services/workflow/pipelines.js`:
```javascript
const NEW_ENTITY_PIPELINE = [
  'stage1',
  'stage2',
  'stage3'
];
```

2. **Update `getPipeline`** function to include new type

3. **Add entity type** to `WorkflowTimeline` model ENUM

4. **Add approval fields** to entity model

5. **Create migration** for new fields

6. **Add controller endpoints** using `workflowController`

### Modifying Pipelines

Simply update the pipeline arrays in `src/services/workflow/pipelines.js`:

```javascript
const ORDER_PIPELINE = [
  'dealer_admin',
  'territory_manager',
  // Add or remove stages as needed
  'new_stage',
  'regional_admin'
];
```

## Testing

Example test cases:

```javascript
// Test approval flow
const order = await Order.create({ ... });
await WorkflowService.startWorkflow('order', order, user);
const result = await WorkflowService.approve('order', order, approver);
expect(result.currentStage).toBe('territory_manager');

// Test rejection
const result = await WorkflowService.reject('order', order, approver, {
  reason: 'Test rejection'
});
expect(order.approvalStatus).toBe('rejected');

// Test workflow status
const status = await WorkflowService.getWorkflowStatus('order', order);
expect(status.timeline.length).toBeGreaterThan(0);
```

## Support

For issues or questions, refer to:
- WorkflowService implementation: `src/services/workflow/WorkflowService.js`
- Pipeline definitions: `src/services/workflow/pipelines.js`
- WorkflowResolver: `src/services/workflow/WorkflowResolver.js`

---

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: December 2024

