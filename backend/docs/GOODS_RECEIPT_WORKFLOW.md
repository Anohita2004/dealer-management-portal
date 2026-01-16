# Goods Receipt Workflow & API Documentation

This document describes the workflow and API endpoints for the Goods Receipt (GR) process in the Dealer Management Portal backend.

## Workflow Overview
1. **Pending Shipments**: Dealers view orders with status `Shipped` or `In Transit`.
2. **Goods Receipt Creation**: Dealer submits a GR for received items, optionally reporting damages.
3. **Inventory Update**: System updates inventory for each received item.
4. **Order Status Update**: Order status is set to `Delivered` upon successful GR posting.
5. **Damage Reporting**: Damaged items are recorded via the DamageRecord model.
6. **Approval/Posting**: GR can be approved, rejected, or posted to SAP (future integration).

## API Endpoints

### GoodsReceipt
- `POST /api/goods-receipt` — Create a new GoodsReceipt
- `GET /api/goods-receipt` — List all GoodsReceipts
- `GET /api/goods-receipt/:id` — Get a single GoodsReceipt by ID
- `PUT /api/goods-receipt/:id` — Update a GoodsReceipt
- `DELETE /api/goods-receipt/:id` — Delete a GoodsReceipt
- `POST /api/goods-receipt/:id/approve` — Approve a GoodsReceipt
- `POST /api/goods-receipt/:id/reject` — Reject a GoodsReceipt
- `POST /api/goods-receipt/:id/post` — Post GoodsReceipt to SAP (stub)

### DamageRecord
- Managed as part of GoodsReceipt creation (see model for structure)

### CostCenter
- Used for cost allocation in GR (see model for structure)

## Models
- See `src/models/GoodsReceipt.js`, `src/models/DamageRecord.js`, `src/models/CostCenter.js` for field details and future MySQL/MongoDB support.

## Notes
- All endpoints require authentication.
- SAP posting is stubbed until integration is available.
- Extend controller logic as needed for business rules.
