# ConstructionOps - Complete Database Schema Documentation

**Generated:** January 21, 2026
**Database:** Supabase PostgreSQL
**Analysis Method:** Direct schema inspection via `information_schema`

---

## 🚨 CRITICAL FINDING: Dual Table System

Your database has **TWO SYSTEMS** for managing contractor-project relationships:

### **Legacy System** (⚠️ Being Phased Out)
- **Table:** `contracts`
- **Usage:** 3 rows
- **Status:** Some code still uses this

### **Modern System** (✅ Current Standard)
- **Table:** `project_contractors`
- **Usage:** 3 rows
- **Status:** Primary system with advanced features

### **Data Overlap Analysis**

| Project ID | Contractor ID | Status | Issue |
|------------|---------------|--------|-------|
| 21 | 26 | ✅ In BOTH tables | Duplicate data (amounts differ!) |
| 21 | 30 | ✅ In BOTH tables | Duplicate data (amounts match) |
| 21 | 31 | 🔴 Only in `contracts` | Orphaned in legacy table |
| 50 | 57 | ✅ Only in `project_contractors` | Correct (modern approach) |

**Problem:** Project 21 has contractors in BOTH tables with **different amounts**!
- Contractor 26: `contracts` = $100,000 vs `project_contractors` = $100

---

## 📊 Table Overview

| Table | Rows | Purpose | Status |
|-------|------|---------|--------|
| `contractors` | 5 | Master contractor list | ✅ Active |
| `contracts` | 3 | Legacy project-contractor junction | ⚠️ Deprecated |
| `project_contractors` | 3 | Modern project-contractor junction | ✅ Active |
| `payment_applications` | 5 | Payment requests | ✅ Active |
| `project_line_items` | 4 | Work breakdown items | ✅ Active |
| `projects` | 3 | Projects master | ✅ Active |
| `property_budgets` | 69 | Budget categories | ✅ Active |
| `change_orders` | 2 | Change orders | ✅ Active |

---

## 📋 Core Schema

### 1. **contractors** (Master Table)
*Stores all contractor companies*

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | integer | NO | Primary key |
| `name` | varchar(255) | NO | Company name |
| `trade` | varchar(100) | NO | Specialty (electrical, plumbing, etc) |
| `phone` | varchar(15) | NO | Contact phone |
| `email` | varchar(255) | YES | Contact email |
| `status` | varchar(50) | YES | active/inactive (default: 'active') |
| `performance_score` | numeric | YES | Rating/score |
| `insurance_status` | varchar | YES | valid/expired (default: 'valid') |
| `license_status` | varchar | YES | valid/expired (default: 'valid') |
| `address` | text | YES | Street address |
| `city` | text | YES | City |
| `state` | text | YES | State |
| `zip` | text | YES | Zip code |
| `contact_name` | text | YES | Primary contact person |
| `created_at` | timestamp | YES | Created timestamp |
| `updated_at` | timestamp | YES | Updated timestamp |

**Foreign Keys:** None (master table)

---

### 2. **contracts** (⚠️ LEGACY - Being Deprecated)
*OLD way of linking contractors to projects*

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | integer | NO | Primary key |
| `project_id` | integer | YES | → `projects.id` |
| `subcontractor_id` | integer | YES | → `contractors.id` |
| `contract_amount` | numeric | YES | Contract value |
| `original_contract_amount` | numeric | YES | Original value before COs |
| `start_date` | date | YES | Contract start |
| `end_date` | date | YES | Contract end |
| `contract_nickname` | varchar(255) | YES | Friendly name |
| `display_order` | integer | YES | Sort order (default: 0) |
| `created_at` | timestamp | YES | Created timestamp |

**Foreign Keys:**
- `subcontractor_id` → `contractors.id`
- `project_id` → `projects.id`

**⚠️ Issues:**
- No payment tracking
- No budget linking
- No contract status
- Being replaced by `project_contractors`

---

### 3. **project_contractors** (✅ MODERN - Current Standard)
*NEW way of linking contractors to projects with advanced features*

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | integer | NO | Primary key |
| `project_id` | integer | YES | → `projects.id` |
| `contractor_id` | integer | YES | → `contractors.id` |
| `contract_amount` | numeric | NO | Current contract value |
| `original_contract_amount` | numeric | YES | Original before COs (default: 0) |
| `paid_to_date` | numeric | YES | Total paid so far (default: 0) |
| `last_payment_date` | date | YES | Most recent payment date |
| `contract_status` | varchar(50) | YES | active/completed/terminated (default: 'active') |
| `change_orders_pending` | boolean | YES | Has pending COs (default: false) |
| `budget_item_id` | integer | YES | → `property_budgets.id` |
| `display_order` | integer | YES | Sort order (default: 0) |
| `updated_at` | timestamp | YES | Last modified timestamp |

**Foreign Keys:**
- `contractor_id` → `contractors.id`
- `project_id` → `projects.id`
- `budget_item_id` → `property_budgets.id`

**✅ Advantages over `contracts`:**
- ✅ Tracks `paid_to_date` for payment progress
- ✅ Links to `budget_item_id` for budget tracking
- ✅ Has `contract_status` for lifecycle management
- ✅ Tracks `change_orders_pending` flag
- ✅ Stores `last_payment_date` for history

---

### 4. **payment_applications**
*Payment requests from contractors*

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | integer | NO | Primary key |
| `project_id` | integer | YES | → `projects.id` |
| `contractor_id` | integer | YES | → `contractors.id` |
| `payment_period_end` | date | YES | Period ending date |
| `status` | varchar(30) | YES | initiated/submitted/approved/rejected (default: 'initiated') |
| `total_contract_amount` | numeric | YES | Total contract value |
| `previous_payments` | numeric | YES | Sum of prior payments (default: 0) |
| `current_payment` | numeric | YES | This payment amount (default: 0) |
| `current_period_value` | numeric | YES | Work completed this period (default: 0) |
| `final_amount` | numeric | YES | Final approved amount |
| `sms_conversation_id` | integer | YES | SMS thread reference |
| `lien_waiver_required` | boolean | YES | Needs lien waiver (default: false) |
| `photos_uploaded_count` | integer | YES | Number of photos (default: 0) |
| `pm_verification_completed` | boolean | YES | PM verified (default: false) |
| `pm_notes` | text | YES | PM notes |
| `approved_by` | integer | YES | → `users.id` |
| `approved_at` | timestamp | YES | Approval timestamp |
| `approval_notes` | text | YES | Approval notes |
| `rejected_by` | text | YES | Who rejected |
| `rejected_at` | timestamp | YES | Rejection timestamp |
| `rejection_notes` | text | YES | Rejection reason |
| `due_date` | date | YES | Payment due date |
| `created_at` | timestamp | YES | Created timestamp |
| `updated_at` | timestamp | YES | Updated timestamp |

**Foreign Keys:**
- `project_id` → `projects.id`
- `contractor_id` → `contractors.id` (directly, not via junction table!)
- `approved_by` → `users.id`

**⚠️ Important:** Uses `contractor_id` directly, not contract_id!

---

### 5. **project_line_items**
*Breakdown of work items for contractors*

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | integer | NO | Primary key |
| `project_id` | integer | YES | → `projects.id` |
| `contractor_id` | integer | YES | → `contractors.id` |
| `contract_id` | integer | YES | → `contracts.id` (⚠️ LEGACY) |
| `item_no` | varchar | YES | Line item number |
| `description_of_work` | text | YES | Work description |
| `scheduled_value` | numeric | YES | Total budgeted amount |
| `original_contract_amount` | numeric | YES | Original contract value |
| `from_previous_application` | numeric | YES | Previously completed |
| `this_period` | numeric | YES | Work this period |
| `material_presently_stored` | numeric | YES | Stored materials value |
| `percent_gc` | numeric | YES | GC percentage |
| `percent_completed` | real | YES | Completion percentage |
| `amount_for_this_period` | real | YES | Amount billed this period |
| `status` | varchar(20) | YES | active/inactive (default: 'active') |
| `display_order` | integer | YES | Sort order |
| `created_at` | timestamp | YES | Created timestamp |
| `updated_at` | timestamp | YES | Updated timestamp |

**Foreign Keys:**
- `project_id` → `projects.id`
- `contractor_id` → `contractors.id`
- `contract_id` → `contracts.id` (⚠️ LEGACY!)

**⚠️ Issue:** Has BOTH `contractor_id` and `contract_id`!
- Should only use `contractor_id` going forward
- `contract_id` is legacy and should be removed

---

### 6. **change_orders**
*Change orders affecting contracts*

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | integer | NO | Primary key |
| `co_number` | varchar(50) | NO | CO reference number |
| `project_id` | integer | NO | → `projects.id` |
| `contractor_id` | integer | YES | → `contractors.id` |
| `budget_category_id` | integer | YES | → `property_budgets.id` |
| `title` | varchar(255) | NO | CO title |
| `description` | text | NO | Detailed description |
| `reason_category` | varchar(50) | NO | Category (Owner Request, etc) |
| `justification` | text | YES | Why needed |
| `cost_impact` | numeric | NO | Cost change amount |
| `schedule_impact_days` | integer | YES | Days added/removed (default: 0) |
| `status` | varchar(20) | NO | draft/submitted/approved (default: 'draft') |
| `priority` | varchar | YES | low/medium/high (default: 'medium') |
| `created_by` | uuid | YES | Creator user ID |
| `approved_by` | uuid | YES | Approver user ID |
| `submitted_date` | timestamp | YES | Submission date |
| `approved_date` | timestamp | YES | Approval date |
| `notes` | text | YES | Additional notes |
| `created_at` | timestamp | YES | Created timestamp |
| `updated_at` | timestamp | YES | Updated timestamp |

**Foreign Keys:**
- `project_id` → `projects.id`
- `contractor_id` → `contractors.id`
- `budget_category_id` → `property_budgets.id`

---

### 7. **property_budgets**
*Budget categories for projects*

| Column | Type | Description |
|--------|------|-------------|
| `id` | integer | Primary key |
| `project_id` | integer | → `projects.id` |
| `category_name` | varchar | Budget category name |
| `original_amount` | numeric | Initial budget |
| `is_active` | boolean | Active flag |
| *(more columns exist)* | | |

**Foreign Keys:**
- `project_id` → `projects.id`

---

## 🔗 Relationship Diagram

```
                    ┌─────────────┐
                    │  projects   │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │   budgets   │ │  contracts  │ │  proj_contr │
    │  (active)   │ │  (LEGACY!)  │ │  (MODERN!)  │
    └─────────────┘ └──────┬──────┘ └──────┬──────┘
                           │               │
                           └───────┬───────┘
                                   │
                                   ▼
                           ┌─────────────┐
                           │ contractors │ ◄─────┐
                           └──────┬──────┘       │
                                  │              │
                 ┌────────────────┼──────────┐   │
                 │                │          │   │
                 ▼                ▼          ▼   │
          ┌────────────┐   ┌──────────┐  ┌────────────┐
          │  payment_  │   │ line_    │  │  change_   │
          │  apps      │   │ items    │  │  orders    │
          └────────────┘   └──────────┘  └────────────┘
```

---

## ⚠️ Data Inconsistencies Found

### 1. **Duplicate Contractor Assignments**
Project 21 has contractors in BOTH tables:

| Contractor | contracts amount | project_contractors amount | Issue |
|------------|------------------|---------------------------|-------|
| 26 | $100,000 | $100 | ❌ **Amounts differ by 1000x!** |
| 30 | $100,000 | $100,000 | ⚠️ Duplicate but amounts match |
| 31 | $10,000,000 | *(null)* | ⚠️ Only in legacy table |

### 2. **Orphaned Data**
- Contractor 31 only exists in `contracts` (legacy)
- No corresponding entry in `project_contractors`

### 3. **Code Using Wrong Table**
20+ files still query `contracts` instead of `project_contractors`:
- `useDataQueries.ts`
- `CreatePunchListModal.tsx`
- `ContractorDetailView.tsx`
- `PMDashboard.tsx`
- `ProjectsView.tsx`
- API routes in `/api/contracts/*`

---

## 📝 Recommendations

### **IMMEDIATE (Critical)**

1. **Fix Data Inconsistency for Project 21**
   ```sql
   -- Investigate which amount is correct for contractor 26
   -- Update project_contractors to match contracts, OR
   -- Update contracts to match project_contractors
   ```

2. **Migrate Contractor 31**
   ```sql
   -- Add contractor 31 to project_contractors
   INSERT INTO project_contractors (project_id, contractor_id, contract_amount, ...)
   VALUES (21, 31, 10000000, ...);
   ```

### **SHORT TERM (Within 2 weeks)**

3. **Update All Code to Use `project_contractors`**
   - Migrate 20+ files from `contracts` → `project_contractors`
   - Update API endpoints
   - Remove `contract_id` from `project_line_items` (use only `contractor_id`)

4. **Update Foreign Keys**
   ```sql
   -- Change payment_applications to use project_contractors
   -- Add junction table reference if needed
   ```

### **LONG TERM (Within 1 month)**

5. **Deprecate `contracts` Table**
   ```sql
   -- 1. Migrate all remaining data
   -- 2. Remove foreign key constraints
   -- 3. Rename table to contracts_legacy
   -- 4. Eventually drop table
   ```

6. **Clean Up `project_line_items`**
   ```sql
   -- Remove contract_id column
   ALTER TABLE project_line_items DROP COLUMN contract_id;
   ```

---

## 🎯 Migration Script (Draft)

```sql
-- STEP 1: Migrate remaining data from contracts to project_contractors
INSERT INTO project_contractors (
  project_id,
  contractor_id,
  contract_amount,
  original_contract_amount,
  paid_to_date,
  contract_status,
  display_order
)
SELECT
  project_id,
  subcontractor_id,
  contract_amount,
  original_contract_amount,
  0, -- paid_to_date (set to 0 for legacy data)
  'active',
  display_order
FROM contracts c
WHERE NOT EXISTS (
  SELECT 1 FROM project_contractors pc
  WHERE pc.project_id = c.project_id
  AND pc.contractor_id = c.subcontractor_id
);

-- STEP 2: Update payment_applications to track which system
-- (Optional) Add metadata to track migration

-- STEP 3: Archive legacy table
ALTER TABLE contracts RENAME TO contracts_legacy_backup_20260121;

-- STEP 4: Remove contract_id from project_line_items
-- (Do this after ensuring all code uses contractor_id)
-- ALTER TABLE project_line_items DROP COLUMN contract_id;
```

---

## 📊 Current System Usage

### **Which Table Should You Use?**

| Feature | Use This Table | Why |
|---------|---------------|-----|
| Add contractor to project | `project_contractors` | Modern, has payment tracking |
| Track payments | `project_contractors` | Has `paid_to_date` |
| Link to budget | `project_contractors` | Has `budget_item_id` |
| Payment applications | `payment_applications` | Uses `contractor_id` directly |
| Line items | `project_line_items` | Should use `contractor_id` only |
| Change orders | `change_orders` | Uses `contractor_id` directly |

### **Files Already Using Modern System**
✅ `ProjectContractorsTab.tsx` (refactored)
✅ `SubcontractorSelectionView.tsx` (fixed)
✅ `ContractorService` (new service layer)
✅ `useContractors` hook (new)

### **Files Still Using Legacy System**
❌ 20+ files querying `contracts` table
❌ `project_line_items` still has `contract_id`

---

## 🔍 Quick Reference

### **Get Contractors for a Project**
```sql
-- ✅ CORRECT (Modern)
SELECT * FROM project_contractors
WHERE project_id = 50
AND contract_status = 'active';

-- ❌ WRONG (Legacy)
SELECT * FROM contracts
WHERE project_id = 50;
```

### **Add Contractor to Project**
```sql
-- ✅ CORRECT
INSERT INTO project_contractors (
  project_id, contractor_id, contract_amount,
  original_contract_amount, paid_to_date, contract_status
) VALUES (50, 57, 100000, 100000, 0, 'active');

-- ❌ WRONG
INSERT INTO contracts (
  project_id, subcontractor_id, contract_amount
) VALUES (50, 57, 100000);
```

---

## 📞 Support

If you have questions about this schema or need help with migration:
1. Check this document first
2. Review the foreign key relationships in PART 2
3. Verify data consistency with PART 6 queries

**Last Updated:** January 21, 2026
**Next Review:** After migration to `project_contractors` is complete
