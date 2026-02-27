# Contractors API Endpoints

## Overview

Two endpoints are available for fetching project contractors with different levels of detail:

1. **Basic Contractors** - `/api/projects/[id]/contractors`
2. **Contractors with Payment Status** - `/api/projects/[id]/contractors/with-payments`

---

## 1. GET /api/projects/[id]/contractors

**Description:** Fetch all contractors for a specific project with basic contract information.

**Authentication:** Required (via `withAuth` middleware)

### Request

```
GET /api/projects/123/contractors
```

### Response

```json
{
  "contractors": [
    {
      "id": 45,
      "project_id": 123,
      "contractor_id": 78,
      "contract_amount": 150000,
      "original_contract_amount": 150000,
      "paid_to_date": 75000,
      "display_order": 1,
      "contract_status": "active",
      "budget_item_id": 12,
      "contractors": {
        "id": 78,
        "name": "ABC Plumbing Inc",
        "trade": "Plumbing",
        "phone": "+1 555 123 4567",
        "email": "contact@abcplumbing.com"
      },
      "property_budgets": {
        "id": 12,
        "category_name": "Plumbing",
        "original_amount": 200000
      }
    }
  ],
  "count": 1
}
```

### Use Cases

- Display contractor list in project view
- Export contractor data
- Generate reports
- Simple contractor lookups

---

## 2. GET /api/projects/[id]/contractors/with-payments

**Description:** Fetch all contractors with enhanced payment application status and financial metrics.

**Authentication:** Required (via `withAuth` middleware)

### Request

```
GET /api/projects/123/contractors/with-payments
```

### Response

```json
[
  {
    "id": 45,
    "project_id": 123,
    "contractor_id": 78,
    "contract_amount": 150000,
    "original_contract_amount": 150000,
    "paid_to_date": 75000,
    "display_order": 1,
    "contract_status": "active",
    "budget_item_id": 12,
    "contractors": {
      "id": 78,
      "name": "ABC Plumbing Inc",
      "trade": "Plumbing",
      "phone": "+1 555 123 4567",
      "email": "contact@abcplumbing.com"
    },
    "property_budgets": {
      "id": 12,
      "category_name": "Plumbing",
      "original_amount": 200000
    },
    "approved_cos": 2,
    "co_total": 15000,
    "approved_unpaid": 25000,
    "pending_review": 30000,
    "remaining": 20000,
    "pending_payments": [
      {
        "id": 567,
        "reference": "PA-0567",
        "amount": 30000,
        "status": "submitted",
        "created_at": "2026-02-15T10:30:00Z"
      }
    ]
  }
]
```

### Additional Fields

| Field | Type | Description |
|-------|------|-------------|
| `approved_cos` | number | Count of approved change orders |
| `co_total` | number | Total cost impact of approved change orders |
| `approved_unpaid` | number | Sum of approved but unpaid payment applications |
| `pending_review` | number | Sum of payment applications pending review |
| `remaining` | number | Remaining contract balance (contract_amount - paid - approved_unpaid - pending_review) |
| `pending_payments` | array | Recent payment applications (up to 3, with status submitted/needs_review/approved) |

### Use Cases

- Payment processing dashboards
- Financial reporting
- Cash flow analysis
- Contractor payment tracking
- Budget vs. actual comparisons

---

## Performance Considerations

### Basic Endpoint
- **Queries:** 1 database query
- **Response Time:** ~50-100ms
- **Recommended for:** Lists, exports, simple displays

### With-Payments Endpoint
- **Queries:** 1 + (N × 4) database queries (where N = number of contractors)
- **Response Time:** ~200-500ms for 10 contractors
- **Recommended for:** Payment dashboards, financial analysis

⚠️ **Note:** The `with-payments` endpoint makes multiple queries per contractor and can be slower for projects with many contractors. Use the basic endpoint when payment status is not needed.

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid project ID",
  "code": "VALIDATION_ERROR"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to fetch contractors",
  "code": "INTERNAL_ERROR"
}
```

---

## Migration Guide

### From Direct Supabase to API

**Before:**
```typescript
const { data } = await supabase
  .from('project_contractors')
  .select('*')
  .eq('project_id', projectId);
```

**After:**
```typescript
// Basic contractor data
const response = await authFetch(`/api/projects/${projectId}/contractors`);
const { contractors } = await response.json();

// OR with payment status
const contractors = await authFetch(`/api/projects/${projectId}/contractors/with-payments`);
const data = await response.json();
```

---

## Related Endpoints

- `GET /api/contractors/[id]` - Get single contractor details
- `GET /api/contractors/with-history` - Get contractors with project history
- `GET /api/projects/[id]/contractors/[contractorId]/contract` - Get specific contract details

---

**Last Updated:** February 23, 2026
