# Super Admin Campaign & Geography Management - Frontend Implementation Guide

This guide details the frontend components required to implement the Super Admin capabilities for Geography Management and Regional Campaign Targeting, interacting with the backend API I have verified.

## 1. Geography Management (Super Admin)

**Location in App:** `Admin Panel > Geography` or `/admin/geography`

### A. Region Management
*   **List API:** `GET /api/regions`
*   **Create API:** `POST /api/regions`
*   **Form Fields:**
    *   `name` (Text, Required)
    *   `geojson` (JSON editor or File Upload, Optional)
    *   `centroidLat`, `centroidLng` (Number, Optional)

### B. Area Management
*   **List API:** `GET /api/areas` (Filter by `regionId` if needed)
*   **Create API:** `POST /api/areas`
*   **Form Fields:**
    *   `name` (Text, Required)
    *   `regionId` (Dropdown from Regions List, Required)

### C. Territory Management
*   **List API:** `GET /api/territories`
*   **Create API:** `POST /api/territories`
*   **Form Fields:**
    *   `name` (Text, Required)
    *   `areaId` (Dropdown from Areas List, Required)

---

## 2. Dealer Assignment (Super Admin)

**Location in App:** `Dealer Management > Create/Edit Dealer`

When creating a new dealer or editing an existing one, you must implement **Cascading Dropdowns** for geographic assignment.

### Logic:
1.  **Fetch Regions:** `GET /api/regions` -> User selects Region.
2.  **Fetch Areas:** `GET /api/areas` -> Filter client-side by `regionId` OR Backend supports filtering.
    *   *Note:* Backend returns all areas. Client should filter: `areas.filter(a => a.regionId === selectedRegionId)`.
3.  **Fetch Territories:** `GET /api/territories` -> Filter client-side by `areaId`.
    *   *Note:* Backend returns all territories. Client should filter: `territories.filter(t => t.areaId === selectedAreaId)`.

### Payload (POST /api/dealers):
```json
{
  "businessName": "Demo Dealer",
  "dealerCode": "D001",
  "regionId": "UUID_REGION",     // Selected Region
  "areaId": "UUID_AREA",         // Selected Area
  "territoryId": "UUID_TERRITORY", // Selected Territory
  // ... other fields
}
```

---

## 3. Campaign Creation & Targeting (Super Admin)

**Location in App:** `Campaigns > Create Campaign` (`/campaigns/create`)

### API Endpoint: `POST /api/campaigns`

### Target Audience UI Component
Replace simple text inputs with a **Dynamic Targeting Selector**.

**UI Elements:**
1.  **Target Type Dropdown:**
    *   Options: `All`, `Region`, `Area`, `Territory`, `Dealer`
2.  **Entity Selector (Dropdown/Multi-select):**
    *   If `Region` selected -> Load Regions list.
    *   If `Area` selected -> Load Areas list.
    *   If `Territory` selected -> Load Territories list.
    *   If `Dealer` selected -> Load Dealers list.

**Constructing the Payload:**
The backend expects an array of objects for `targetAudience`.

*   **Scenario 1: Target a specific Region**
    ```json
    {
      "campaignName": "North Region Monsoon Sale",
      "targetAudience": [
        { "type": "region", "entityId": "UUID_OF_NORTH_REGION" }
      ]
      // ... other fields
    }
    ```

*   **Scenario 2: Target multiple Areas**
    ```json
    {
      "targetAudience": [
        { "type": "area", "entityId": "UUID_AREA_1" },
        { "type": "area", "entityId": "UUID_AREA_2" }
      ]
    }
    ```

*   **Scenario 3: Target Global (All)**
    ```json
    {
      "targetAudience": [
        { "type": "all" }
      ]
    }
    ```

### Validation
*   Ensure `entityId` is provided if type is NOT `all`.
*   Ensure `startDate` < `endDate`.

---

## 4. Inventory Stock Integration

The backend automatically handles stock reduction. No special frontend work is needed for "placing orders" differently, EXCEPT:

*   **Inventory Dashboard:** `/inventory/details`
    *   Show `stock` vs `reorderLevel`.
    *   Highlight low stock items (Backend provides logic, Frontend displays red/warning).
