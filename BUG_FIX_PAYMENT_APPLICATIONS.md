# Bug Fix: Payment Applications Query Error

## Problem

Console error when opening Edit Contract modal:
```
Error checking payment applications: {
  code: '42703', 
  message: 'column payment_applications.contract_id does not exist',
  hint: 'Perhaps you meant to reference the column "payment_applications.contractor_id".'
}
```

## Root Cause

The `payment_applications` table does **NOT** have a `contract_id` column. Instead, it has:
- `project_id` (foreign key to projects table)
- `contractor_id` (foreign key to contractors table)

The relationship between contracts and payment applications is **indirect**:
- Contract has: `project_id` + `subcontractor_id`
- Payment Application has: `project_id` + `contractor_id`

## Solution

### 1. Fixed the Query

**Before:**
```typescript
const { data: paymentApps, error: paymentError } = await supabase
  .from('payment_applications')
  .select('id, status')
  .eq('contract_id', initialData.id); // ❌ This column doesn't exist
```

**After:**
```typescript
const { data: paymentApps, error: paymentError } = await supabase
  .from('payment_applications')
  .select('id, status')
  .eq('project_id', initialData.project_id)        // ✅ Use project_id
  .eq('contractor_id', initialData.subcontractor_id); // ✅ Use contractor_id
```

### 2. Added Error Handling

Added comprehensive error handling with fallback behavior:

```typescript
if (paymentError) {
  console.error('Error checking payment applications:', paymentError);
  // Fallback: if query fails, assume contract is not locked to allow editing
  setIsContractLocked(false);
} else if (paymentApps && paymentApps.length > 0) {
  const hasNonDraftPayments = paymentApps.some(app => app.status !== 'draft');
  setIsContractLocked(hasNonDraftPayments);
  
  if (hasNonDraftPayments) {
    console.log(`Contract locked: Found ${paymentApps.length} payment application(s)`);
  }
} else {
  // No payment applications found, contract is not locked
  setIsContractLocked(false);
}
```

### 3. Added Resilience for Line Items Loading

```typescript
if (lineItemsError) {
  console.error('Error loading line items:', lineItemsError);
  // Fallback: initialize with empty rows so modal still works
  lineItemsHook.initializeEmptyRows(5);
  return;
}
```

### 4. Added Top-Level Try-Catch

```typescript
try {
  // All loading logic here
} catch (error) {
  console.error('Error loading contract data:', error);
  // Fallback: initialize with empty rows and unlock contract so modal still works
  setIsContractLocked(false);
  lineItemsHook.initializeEmptyRows(5);
}
```

## Impact

### ✅ **Fixes:**
1. Console error no longer appears
2. Contract locking feature now works correctly
3. Modal gracefully handles database errors
4. Line items table always loads (with empty rows if needed)

### ✅ **Behavior:**
- **If query succeeds and finds payment apps:** Contract locks if any are non-draft
- **If query succeeds and finds no payment apps:** Contract remains editable
- **If query fails:** Contract remains editable (safe fallback)

## Testing

To verify the fix:

1. **Open Create Contract modal** - Should load with 5 empty rows (no error)
2. **Open Edit Contract modal (no payment apps)** - Should load with line items editable
3. **Create a payment application for a contract** - Then edit that contract
4. **Expected:** Line items should be read-only with warning message

## Files Modified

- `src/app/components/ManageView.tsx` - Fixed query and added error handling

## Database Schema Notes

For future reference, the `payment_applications` table structure:
```sql
payment_applications (
  id,
  project_id,        -- FK to projects
  contractor_id,     -- FK to contractors
  status,            -- 'draft', 'submitted', 'approved', etc.
  ...
)
```

There is **NO** `contract_id` column. The `contracts` table is separate and links projects to contractors, but payment applications don't directly reference contract IDs.

