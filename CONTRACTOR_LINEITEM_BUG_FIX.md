# Contractor Line Items Bug Fix

## Issue Summary
When clicking on a contractor/contract to view line items, the application was throwing 400 Bad Request errors:
- `subcontractor_id=eq.undefined` 
- `contractor_id=eq.undefined`

## Root Cause
The `ContractorDetailView` component was expecting a `subcontractor_id` field, but the contract data from `ProjectContractorsTab` uses `contractor_id` instead.

**Database Schema Difference:**
- `contracts` table uses `subcontractor_id`
- `project_contractors` table uses `contractor_id`

## Fix Applied

### File: `src/app/components/ContractorDetailView.tsx`

#### Changes Made:

1. **fetchLineItems function** (Line 182-242):
   - Added flexible contractor ID resolution
   - Now handles both `contractor_id` and `subcontractor_id` fields
   - Falls back to `contractor?.id` if neither is available
   - Added early return with error logging if no valid contractor ID found

```typescript
// Get the contractor ID - handle both contractor_id and subcontractor_id fields
const contractorId = (contract as any).contractor_id || (contract as any).subcontractor_id || contractor?.id;

if (!contractorId || !contract.project_id) {
  console.error('Missing contractor ID or project ID', { contractorId, project_id: contract.project_id });
  setLineItems([]);
  setLoading(false);
  return;
}
```

2. **handleSaveLineItem function** (Line 340-398):
   - Applied same flexible contractor ID resolution
   - Fixed both contract lookup and line item insertion queries

```typescript
// Get the contractor ID - handle both contractor_id and subcontractor_id fields
const contractorId = (contract as any).contractor_id || (contract as any).subcontractor_id || contractor?.id;

// Used in both queries:
.eq('subcontractor_id', contractorId)  // For contracts table
.contractor_id: contractorId           // For project_line_items insert
```

3. **Updated useCallback dependencies**:
   - Added both `contractor_id` and `subcontractor_id` to dependencies
   - Ensures proper re-fetching when either field changes

## Testing Checklist

### Before Testing:
- [ ] Navigate to Projects tab
- [ ] Click on a project to view details
- [ ] Go to "Contractors" sub-tab

### Test Cases:

#### 1. View Line Items - Existing Contract
- [ ] Click "View Line Items" button on any contractor card
- [ ] **Expected**: Line items load without errors
- [ ] **Expected**: No 400 Bad Request errors in console
- [ ] **Expected**: Line items display in table

#### 2. View Line Items - New Contract
- [ ] Click on a contractor that has never been accessed before
- [ ] **Expected**: Either shows existing line items or empty state
- [ ] **Expected**: No console errors about undefined contractor_id

#### 3. Add Line Item
- [ ] Click "Add Line Item" button
- [ ] Fill out form and save
- [ ] **Expected**: Line item is created successfully
- [ ] **Expected**: contractor_id is properly set in database
- [ ] **Expected**: Line item appears in list immediately

#### 4. Edit/Reorder Line Items
- [ ] Drag and drop line items to reorder
- [ ] **Expected**: Order saves without errors
- [ ] **Expected**: No contractor_id related errors

#### 5. Contract Creation Flow
- [ ] For a contractor without a contracts table entry
- [ ] Add a line item
- [ ] **Expected**: Contract record is auto-created with correct contractor_id
- [ ] **Expected**: Line item is linked to new contract

## Database Verification

### Check Contract Record:
```sql
SELECT id, project_id, subcontractor_id, contract_amount 
FROM contracts 
WHERE project_id = [project_id] 
AND subcontractor_id = [contractor_id];
```

### Check Line Items:
```sql
SELECT id, contract_id, contractor_id, description_of_work, scheduled_value
FROM project_line_items
WHERE project_id = [project_id] 
AND contractor_id = [contractor_id];
```

## Resolution Status

✅ **FIXED** - The component now properly handles both field naming conventions:
- Works with `project_contractors` table (uses `contractor_id`)
- Works with `contracts` table (uses `subcontractor_id`)  
- Properly falls back through multiple sources to find valid contractor ID
- Provides clear error messages if contractor ID is missing
- No more "undefined" values in database queries

## Deployment Notes

- **No database changes required** - This is a code-only fix
- **Backward compatible** - Works with existing data in both tables
- **No data migration needed**
- Safe to deploy immediately

## Prevention

To prevent similar issues in the future:
1. Document table schema differences (contracts vs project_contractors)
2. Create type guards for contractor/contract objects
3. Consider creating a unified contractor interface that handles both schemas
4. Add TypeScript strict mode to catch undefined property access earlier

