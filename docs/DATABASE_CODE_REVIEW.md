# Database & Code Review - Findings & Recommendations

**Date:** December 17, 2025  
**Reviewer:** System Audit  
**Status:** Critical Issues Found

---

## 🚨 Critical Issues

### 1. **Dual Contract Tables - Data Integrity Risk**

**Severity:** HIGH  
**Impact:** Data inconsistency, confusion, potential bugs

**Problem:**
The database has TWO separate tables for managing contracts:
- `contracts` table
- `project_contractors` table

Both tables serve similar purposes but are used inconsistently:

```sql
-- Table 1: contracts
CREATE TABLE contracts (
  id                  INTEGER PRIMARY KEY,
  project_id          INTEGER REFERENCES projects(id),
  subcontractor_id    INTEGER REFERENCES contractors(id),
  contract_amount     NUMERIC,
  start_date          DATE,
  end_date            DATE,
  contract_nickname   VARCHAR,
  status              VARCHAR
);

-- Table 2: project_contractors  
CREATE TABLE project_contractors (
  id                    INTEGER PRIMARY KEY,
  project_id            INTEGER REFERENCES projects(id),
  contractor_id         INTEGER REFERENCES contractors(id),
  contract_amount       NUMERIC,
  paid_to_date          NUMERIC,
  contract_status       VARCHAR,
  original_contract_amount NUMERIC,
  budget_item_id        INTEGER REFERENCES property_budgets(id)
);
```

**Current Usage:**
- `project_line_items.contract_id` → References `contracts.id`
- Budget tracking uses `project_contractors`
- New API endpoints use `contracts` table
- Some queries use `project_contractors`

**Issues:**
1. **Data Duplication:** Same contract data stored in two places
2. **Sync Problems:** Updates to one table don't reflect in the other
3. **Confusion:** Developers don't know which table to use
4. **Foreign Key Issues:** Line items reference `contracts`, but budget tracking uses `project_contractors`
5. **Missing Fields:** `contracts` lacks `paid_to_date`, `original_contract_amount`, `budget_item_id`

**Recommendation:**
Choose ONE table as the source of truth and migrate all functionality to it.

**Option A: Use `contracts` as primary (Recommended)**
- Add missing columns to `contracts`:
  - `paid_to_date NUMERIC DEFAULT 0`
  - `original_contract_amount NUMERIC`
  - `budget_item_id INTEGER REFERENCES property_budgets(id)`
  - `display_order INTEGER DEFAULT 0`
- Migrate data from `project_contractors` to `contracts`
- Update all queries to use `contracts`
- Drop `project_contractors` table
- Update `project_line_items.contract_id` FK (already correct)

**Option B: Use `project_contractors` as primary**
- Rename `project_contractors` to `contracts`
- Rename `contractor_id` to `subcontractor_id` for consistency
- Add missing columns: `contract_nickname`, `start_date`, `end_date`
- Update `project_line_items.contract_id` FK to reference new table
- Drop old `contracts` table

---

### 2. **Missing Contract Status Column**

**Severity:** MEDIUM  
**Impact:** Soft deletes not working properly

**Problem:**
The `contracts` table schema in DATABASE_SCHEMA.md doesn't show a `status` column, but:
- The API endpoint `/api/contracts/[id]` DELETE method sets `status = 'cancelled'` (soft delete)
- Code references `contract.status`
- The schema documentation is incomplete

**Current API Code:**
```typescript
// Soft delete by setting status to 'cancelled'
const { error: deleteError } = await supabaseAdmin
  .from('contracts')
  .update({ 
    status: 'cancelled',
    updated_at: new Date().toISOString()
  })
  .eq('id', contractId);
```

**Recommendation:**
- Verify if `status` column exists in actual database
- If missing, add it: `ALTER TABLE contracts ADD COLUMN status VARCHAR DEFAULT 'active'`
- Update DATABASE_SCHEMA.md to include this column
- Create index: `CREATE INDEX idx_contracts_status ON contracts(status)`

---

### 3. **Inconsistent Column Naming**

**Severity:** LOW  
**Impact:** Code confusion, maintenance difficulty

**Problem:**
Inconsistent naming between `contracts` and `project_contractors`:
- `contracts.subcontractor_id` vs `project_contractors.contractor_id`
- Both reference the same `contractors` table

**Recommendation:**
Standardize on one naming convention (prefer `contractor_id` for brevity)

---

### 4. **Missing Cascade Delete Configuration**

**Severity:** MEDIUM  
**Impact:** Orphaned records, data integrity

**Problem:**
While `verify-cascade-delete-constraints.sql` sets up cascade deletes for `project_line_items`, the dual table situation creates confusion:

```sql
-- Line items reference contracts table
ALTER TABLE project_line_items
ADD CONSTRAINT project_line_items_contract_id_fkey
FOREIGN KEY (contract_id)
REFERENCES contracts(id)
ON DELETE CASCADE;
```

But if using `project_contractors`, this cascade won't work correctly.

**Recommendation:**
After consolidating to single contracts table, verify all cascade deletes are properly configured.

---

### 5. **Payment Applications Missing Contract Reference**

**Severity:** MEDIUM  
**Impact:** Cannot track which contract a payment belongs to

**Problem:**
`payment_applications` table has:
- `project_id` - which project
- `contractor_id` - which contractor

But missing:
- `contract_id` - which specific contract

**Issue:**
A contractor can have multiple contracts on the same project. Without `contract_id`, you cannot determine which contract the payment application is for.

**Recommendation:**
```sql
ALTER TABLE payment_applications 
ADD COLUMN contract_id INTEGER REFERENCES contracts(id);

CREATE INDEX idx_payment_applications_contract_id 
ON payment_applications(contract_id);
```

---

### 6. **Type Mismatches Between Schema and Code**

**Severity:** LOW  
**Impact:** Potential runtime errors

**Problem:**
TypeScript interface doesn't match database schema:

```typescript
// src/types/schema.ts
export interface Contract {
  id: number;
  project_id: number;
  subcontractor_id: number;
  contract_amount: number;
  contract_nickname?: string;
  start_date: string;
  end_date?: string;
  status?: string;  // ← Missing in DB schema docs
  // Missing: paid_to_date, original_contract_amount, budget_item_id
}
```

**Recommendation:**
Update TypeScript interfaces to match actual database schema after consolidation.

---

## ⚠️ Medium Priority Issues

### 7. **Change Orders Table References Wrong Contract Table**

**Problem:**
```sql
CREATE TABLE change_orders (
  contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  ...
);
```

If budget tracking uses `project_contractors`, this creates a disconnect.

**Recommendation:**
Ensure change orders reference the primary contracts table after consolidation.

---

### 8. **Missing Updated_At Trigger**

**Problem:**
`contracts` table has `created_at` but the schema doesn't show `updated_at` column or trigger.

**Recommendation:**
```sql
ALTER TABLE contracts 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contracts_updated_at 
BEFORE UPDATE ON contracts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 9. **No Unique Constraint on Contract Relationships**

**Problem:**
Nothing prevents creating duplicate contracts for the same project-contractor pair.

**Recommendation:**
```sql
-- For contracts table
CREATE UNIQUE INDEX idx_contracts_project_contractor 
ON contracts(project_id, subcontractor_id) 
WHERE status != 'cancelled';

-- Allows multiple contracts but only one active per project-contractor pair
```

---

## ✅ Things Done Well

1. **API Endpoints** - All CRUD operations properly use `supabaseAdmin` for RLS bypass
2. **Cascade Deletes** - Line items properly cascade when contracts deleted
3. **Indexes** - Good coverage on foreign keys and frequently queried columns
4. **RLS Policies** - Comprehensive row-level security implemented
5. **Error Handling** - API endpoints have proper validation and error responses
6. **Atomic Operations** - Contract + line items created/updated atomically

---

## 📋 Recommended Migration Plan

### Phase 1: Audit Current State (1-2 hours)
1. Query actual database to see which tables exist and their exact schemas
2. Count records in both `contracts` and `project_contractors`
3. Identify which table has more complete data
4. Check for any data that exists in one but not the other

### Phase 2: Schema Consolidation (2-3 hours)
1. Choose primary table (recommend `contracts`)
2. Add missing columns to primary table
3. Create migration script to copy data from secondary table
4. Verify data integrity after migration
5. Update all foreign keys to reference primary table

### Phase 3: Code Updates (3-4 hours)
1. Update TypeScript interfaces
2. Update all queries to use primary table
3. Update API endpoints if needed
4. Update React Query hooks
5. Update components

### Phase 4: Testing (2-3 hours)
1. Test contract CRUD operations
2. Test line items association
3. Test payment applications
4. Test budget tracking
5. Test cascade deletes

### Phase 5: Cleanup (1 hour)
1. Drop secondary table
2. Update documentation
3. Remove old migration files
4. Update DATABASE_SCHEMA.md

**Total Estimated Time:** 9-13 hours

---

## 🔧 Immediate Actions Required

### Priority 1 (Do First)
1. **Audit database** - Run queries to understand current state
2. **Add status column** to contracts if missing
3. **Document decision** on which table to keep

### Priority 2 (Do Soon)
1. **Create migration script** for table consolidation
2. **Add contract_id** to payment_applications
3. **Update TypeScript types**

### Priority 3 (Do Eventually)
1. Add unique constraints
2. Add updated_at triggers
3. Standardize naming conventions

---

## 📊 Database Health Score

| Category | Score | Notes |
|----------|-------|-------|
| Schema Design | 6/10 | Dual tables causing confusion |
| Data Integrity | 7/10 | Good FKs but missing constraints |
| Performance | 8/10 | Good indexes |
| Security | 9/10 | Excellent RLS implementation |
| Documentation | 7/10 | Schema docs incomplete |
| Code Quality | 8/10 | Clean API patterns |
| **Overall** | **7.5/10** | Good foundation, needs consolidation |

---

## 🎯 Success Criteria

After implementing recommendations:
- ✅ Single source of truth for contracts
- ✅ All foreign keys reference correct table
- ✅ No orphaned records possible
- ✅ Clear documentation
- ✅ Type safety between DB and code
- ✅ All tests passing

---

## 📝 SQL Audit Queries

Run these to understand current state:

```sql
-- Check if both tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('contracts', 'project_contractors');

-- Count records in each
SELECT 'contracts' as table_name, COUNT(*) as count FROM contracts
UNION ALL
SELECT 'project_contractors', COUNT(*) FROM project_contractors;

-- Check for overlapping data
SELECT 
  c.id as contract_id,
  pc.id as project_contractor_id,
  c.project_id,
  c.subcontractor_id,
  c.contract_amount as c_amount,
  pc.contract_amount as pc_amount
FROM contracts c
FULL OUTER JOIN project_contractors pc 
  ON c.project_id = pc.project_id 
  AND c.subcontractor_id = pc.contractor_id;

-- Check line items references
SELECT 
  pli.id,
  pli.contract_id,
  c.id as contracts_exists,
  pc.id as project_contractors_exists
FROM project_line_items pli
LEFT JOIN contracts c ON pli.contract_id = c.id
LEFT JOIN project_contractors pc ON pli.contract_id = pc.id
LIMIT 10;

-- Check contracts table schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'contracts'
ORDER BY ordinal_position;

-- Check for status column
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'contracts' 
AND column_name = 'status';
```

---

**Next Steps:** Run audit queries and make decision on table consolidation strategy.
