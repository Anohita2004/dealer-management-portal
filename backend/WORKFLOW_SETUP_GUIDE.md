# Workflow Engine Setup Guide

## Quick Start

### 1. Run Migrations

The workflow engine requires two database migrations:

```bash
npm run migrate:workflow
```

Or manually using Sequelize CLI:

```bash
npx sequelize-cli db:migrate --name 20251212000001-create-workflow-timeline
npx sequelize-cli db:migrate --name 20251212000002-add-current-sla-expires-at
```

### 2. Verify Installation

Test the workflow engine:

```bash
npm run test:workflow
```

### 3. API Endpoints Available

#### Module-Specific Endpoints

**Orders:**
- `PATCH /api/orders/:id/approve` - Approve order
- `PATCH /api/orders/:id/reject` - Reject order
- `GET /api/orders/:id/workflow` - Get workflow status

**Invoices:**
- `PATCH /api/invoices/:id/approve` - Approve invoice
- `PATCH /api/invoices/:id/reject` - Reject invoice
- `GET /api/invoices/:id/workflow` - Get workflow status

**Unified Workflow Routes:**
- `PATCH /api/workflow/:type/:id/approve` - Approve any entity
- `PATCH /api/workflow/:type/:id/reject` - Reject any entity
- `GET /api/workflow/:type/:id/workflow` - Get workflow status

Where `:type` can be: `order`, `invoice`, `payment`, `pricing`, `document`, `campaign`

## Testing the Workflow

### Example: Approve an Order

```bash
curl -X PATCH http://localhost:3000/api/orders/ORDER_ID/approve \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"remarks": "Looks good"}'
```

### Example: Get Workflow Status

```bash
curl -X GET http://localhost:3000/api/orders/ORDER_ID/workflow \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example: Reject an Invoice

```bash
curl -X PATCH http://localhost:3000/api/invoices/INVOICE_ID/reject \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Incorrect amount", "remarks": "Please verify"}'
```

## Integration Checklist

- [x] Migrations created and run
- [x] Models updated with approval fields
- [x] WorkflowService implemented
- [x] Routes configured
- [x] Controllers updated
- [x] Documentation created

## Next Steps

1. **Test with Real Data**: Create test orders/invoices and test the approval flow
2. **Configure Permissions**: Ensure users have correct permissions (`workflow.approve`, `workflow.reject`, `workflow.view`)
3. **Monitor SLA**: Set up monitoring for overdue items
4. **Frontend Integration**: Connect frontend to new workflow endpoints

## Troubleshooting

### Migration Errors

If migrations fail:
1. Check database connection
2. Verify Sequelize is properly configured
3. Check for existing tables/columns

### Permission Errors

If you get 403 errors:
1. Verify user role matches current stage
2. Check user has required permissions
3. Verify role is correctly assigned

### Workflow Not Starting

If workflow doesn't start automatically:
1. Check entity creation code calls `WorkflowService.startWorkflow()`
2. Verify entity has required fields
3. Check for errors in console

## Support

For detailed documentation, see `WORKFLOW_ENGINE_DOCUMENTATION.md`

