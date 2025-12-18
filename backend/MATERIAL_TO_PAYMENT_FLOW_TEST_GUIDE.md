# Material Creation to Payment Flow - Testing Guide

## Overview
This guide helps you test the complete flow from material creation to payment approval.

## Flow Steps

1. **Create Material** → 2. **Create Order** → 3. **Approve Order** → 4. **Create Invoice** → 5. **Approve Invoice** → 6. **Create Payment Request** → 7. **Approve Payment**

---

## Step-by-Step Testing

### Prerequisites
- Ensure you have test users for each role:
  - `inventory_user` - to create materials
  - `dealer_staff` - to create orders and invoices
  - `dealer_admin` - to approve orders/invoices/payments
  - `territory_manager` - to approve orders/invoices/payments
  - `area_manager` - to approve orders/invoices/payments
  - `regional_manager` - to approve orders/invoices/payments
  - `regional_admin` - to approve orders/invoices/payments
  - `finance_admin` - to approve payments

---

### Step 1: Create Material

**Endpoint:** `POST /api/materials`

**User:** `inventory_user` or `super_admin`

**Request:**
```json
{
  "materialCode": "MAT-TEST-001",
  "materialName": "Test Material",
  "description": "Test material for flow testing",
  "unit": "PCS",
  "unitPrice": 1000,
  "category": "Test Category",
  "isActive": true
}
```

**Expected Response:** 201 Created with material ID

**Check:**
- ✅ Material created successfully
- ✅ Material ID returned

---

### Step 2: Create Order

**Endpoint:** `POST /api/orders`

**User:** `dealer_staff` or `dealer_admin`

**Request:**
```json
{
  "items": [
    {
      "materialId": "<material_id_from_step_1>",
      "qty": 10,
      "unitPrice": 1000
    }
  ],
  "notes": "Test order"
}
```

**Expected Response:** 201 Created
```json
{
  "orderId": "uuid",
  "orderNumber": "ORD-1234567890",
  "approvalStage": "dealer_admin",
  "approvalStatus": "pending"
}
```

**Check:**
- ✅ Order created successfully
- ✅ Order has `approvalStage: "dealer_admin"`
- ✅ Order has `approvalStatus: "pending"`
- ✅ Order has `status: "Pending"`

---

### Step 3: Approve Order Through Workflow

**Pipeline:** `dealer_admin → territory_manager → area_manager → regional_manager → regional_admin`

**Endpoint:** `PATCH /api/orders/:id/approve`

#### 3.1: Dealer Admin Approval
**User:** `dealer_admin`

**Request:**
```json
{
  "action": "approve"
}
```

**Check:**
- ✅ Order `approvalStage` moves to `"territory_manager"`
- ✅ Order `approvalStatus` remains `"pending"`

#### 3.2: Territory Manager Approval
**User:** `territory_manager`

**Request:** Same as above

**Check:**
- ✅ Order `approvalStage` moves to `"area_manager"`

#### 3.3: Area Manager Approval
**User:** `area_manager`

**Check:**
- ✅ Order `approvalStage` moves to `"regional_manager"`

#### 3.4: Regional Manager Approval
**User:** `regional_manager`

**Check:**
- ✅ Order `approvalStage` moves to `"regional_admin"`

#### 3.5: Regional Admin Approval (Final)
**User:** `regional_admin`

**Check:**
- ✅ Order `approvalStage` becomes `null`
- ✅ Order `approvalStatus` becomes `"approved"`
- ✅ Order `status` becomes `"Approved"` ⚠️ **CRITICAL CHECK**

**Verify Order Status:**
```bash
GET /api/orders/:id
```

**Expected:**
```json
{
  "id": "uuid",
  "status": "Approved",  // ⚠️ Must be "Approved" (capital A)
  "approvalStatus": "approved",
  "approvalStage": null
}
```

---

### Step 4: Create Invoice from Order

**Endpoint:** `POST /api/invoices`

**User:** `dealer_staff`

**Request:**
```json
{
  "orderId": "<order_id_from_step_2>",
  "invoiceNumber": "INV-TEST-001",
  "invoiceDate": "2024-01-15",
  "dueDate": "2024-02-15",
  "baseAmount": 10000,
  "taxAmount": 1800
}
```

**Expected Response:** 201 Created

**Check:**
- ✅ Invoice created successfully
- ✅ Invoice linked to order (`orderId` set)
- ✅ Invoice has `approvalStage: "dealer_admin"`
- ✅ Invoice has `approvalStatus: "pending"`

**⚠️ Potential Issue:**
If you get error: `"Order must be approved before invoice creation"`, check:
1. Order `status` field is exactly `"Approved"` (not `"approved"` or `"APPROVED"`)
2. Order `approvalStatus` is `"approved"`
3. Order `approvalStage` is `null`

---

### Step 5: Approve Invoice Through Workflow

**Pipeline:** `dealer_admin → territory_manager → area_manager → regional_manager → regional_admin`

**Endpoint:** `PATCH /api/invoices/:id/approve`

Follow the same approval steps as Step 3, but for invoices.

**Final Check:**
- ✅ Invoice `approvalStatus` becomes `"approved"`
- ✅ Invoice `status` becomes `"Approved"`

---

### Step 6: Create Payment Request

**Endpoint:** `POST /api/payments/request`

**User:** `dealer_staff`

**First, get invoice details:**
```bash
GET /api/invoices/:invoice_id
```

**Note the `balanceAmount`** (should equal `totalAmount` if unpaid)

**Request:**
```json
{
  "invoiceId": "<invoice_id_from_step_4>",
  "amount": 11800,  // Must match invoice balanceAmount
  "paymentMode": "bank_transfer",
  "utrNumber": "UTR-123456789"
}
```

**Expected Response:** 201 Created

**Check:**
- ✅ Payment request created
- ✅ Payment has `approvalStage: "dealer_admin"`
- ✅ Payment has `approvalStatus: "pending"`

---

### Step 7: Approve Payment Through Workflow

**Pipeline:** `dealer_admin → territory_manager → area_manager → regional_manager → regional_admin → finance_admin`

**Endpoint:** `POST /api/payments/:id/approve`

**User:** `dealer_admin` (first)

**Request:**
```json
{
  "action": "approve"
}
```

**Check:**
- ✅ Payment `approvalStage` moves to `"territory_manager"`

Continue through all stages until `finance_admin` approves.

**Final Check:**
- ✅ Payment `approvalStatus` becomes `"approved"`
- ✅ Invoice `balanceAmount` is updated
- ✅ Dealer `outstandingAmount` is updated

---

## Common Issues & Fixes

### Issue 1: Order Status Not "Approved"
**Symptom:** Cannot create invoice, error: "Order must be approved before invoice creation"

**Check:**
```sql
SELECT id, status, approvalStatus, approvalStage FROM orders WHERE id = '<order_id>';
```

**Fix:** Ensure the workflow sets `status = 'Approved'` (capital A) when fully approved.

### Issue 2: Invoice Creation Fails
**Symptom:** 400 Bad Request when creating invoice

**Check:**
1. Order exists and belongs to dealer
2. Order status is exactly `"Approved"`
3. User has `dealer_staff` role
4. User has correct `dealerId`

### Issue 3: Payment Amount Mismatch
**Symptom:** "Amount mismatch with invoice balance"

**Fix:** Use the exact `balanceAmount` from the invoice, not `totalAmount`.

### Issue 4: Workflow Stage Not Progressing
**Symptom:** Approval doesn't move to next stage

**Check:**
1. User has correct role for current stage
2. User has required permissions
3. User is in correct region/area/territory (for managers)
4. Workflow service is working correctly

---

## Quick Test Checklist

- [ ] Material created
- [ ] Order created with workflow started
- [ ] Order approved through all stages
- [ ] Order status is "Approved" (capital A)
- [ ] Invoice created from approved order
- [ ] Invoice approved through all stages
- [ ] Payment request created
- [ ] Payment approved through all stages
- [ ] Invoice balance updated
- [ ] Dealer outstanding amount updated

---

## API Endpoints Summary

| Step | Method | Endpoint | User Role |
|------|--------|----------|-----------|
| 1. Create Material | POST | `/api/materials` | `inventory_user` |
| 2. Create Order | POST | `/api/orders` | `dealer_staff` |
| 3. Approve Order | PATCH | `/api/orders/:id/approve` | Various managers |
| 4. Create Invoice | POST | `/api/invoices` | `dealer_staff` |
| 5. Approve Invoice | PATCH | `/api/invoices/:id/approve` | Various managers |
| 6. Create Payment | POST | `/api/payments/request` | `dealer_staff` |
| 7. Approve Payment | POST | `/api/payments/:id/approve` | Various managers + `finance_admin` |

---

## Testing with Postman/Thunder Client

1. **Set up environment variables:**
   - `BASE_URL`: `http://localhost:3000/api`
   - `INVENTORY_TOKEN`: Token from inventory_user login
   - `DEALER_STAFF_TOKEN`: Token from dealer_staff login
   - `DEALER_ADMIN_TOKEN`: Token from dealer_admin login
   - `TM_TOKEN`: Token from territory_manager login
   - `AM_TOKEN`: Token from area_manager login
   - `RM_TOKEN`: Token from regional_manager login
   - `RA_TOKEN`: Token from regional_admin login
   - `FA_TOKEN`: Token from finance_admin login

2. **Create a collection** with all the requests above

3. **Run sequentially** and save IDs from each step

4. **Verify each step** before proceeding to next

---

## Automated Testing

See `test-material-to-payment-flow.js` for an automated test script (requires axios package).

To install axios:
```bash
npm install axios
```

To run:
```bash
node test-material-to-payment-flow.js
```

**Note:** Update the test script with actual user credentials before running.

