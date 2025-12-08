# Fix Payment Approval/Rejection Workflow and Line Item Lifecycle

## Problems Identified

### Problem 1: Premature Line Item Updates
**Location:** `/api/sms/webhook/route.ts` lines 232-240  
**Issue:** Updates `project_line_items` table BEFORE payment approval  
**Impact:** 
- Rejected payments leave incorrect percentages in master line items table
- `from_previous_application` gets set before PM review
- Creates data integrity issues

### Problem 2: No Baseline Update on Approval
**Location:** `/api/payments/[id]/approve/route.ts`  
**Issue:** Doesn't update `project_line_items.from_previous_application` after approval  
**Impact:**
- Next payment application can't calculate cumulative percentages correctly
- SMS workflow shows incorrect "previous" values
- Cumulative payment tracking breaks after first payment

### Problem 3: No Rollback on Rejection
**Location:** `/api/payments/[id]/reject/route.ts`  
**Issue:** Doesn't revert `project_line_items` changes made during SMS workflow  
**Impact:**
- Master line items show unapproved/rejected percentages
- Budget tracking could be incorrect
- Data shows wrong completion status

### Problem 4: No Rollback on Recall
**Location:** `/api/payments/[id]/recall/route.ts`  
**Issue:** Doesn't reduce budget or revert line item baselines after recalling approved payment  
**Impact:**
- `project.spent` and `contractor.paid_to_date` stay inflated
- Line items still show approved percentages
- Financial tracking becomes incorrect

### Problem 5: SMS Workflow References Wrong Previous Data
**Location:** `/api/sms/webhook/route.ts` lines 177-184, 253-260  
**Issue:** Queries ALL previous `payment_line_item_progress` records, not just approved ones  
**Impact:**
- Rejected/pending payments are treated as baseline
- Contractor sees wrong "previous" percentage
- Validation logic could incorrectly block submissions

## Current vs Desired Workflow

### Current Workflow (Broken)
```
1. SMS Submit → Updates project_line_items (❌ Too early)
2. PM Review → Updates payment_line_item_progress only
3. Approve → Updates budget (✅) but NOT line item baselines (❌)
4. Reject → No rollback (❌)
5. Recall → No rollback (❌)
```

### Desired Workflow (Fixed)
```
1. SMS Submit → Updates payment_line_item_progress ONLY (✅)
2. PM Review → Updates payment_line_item_progress ONLY (✅)
3. Approve → Updates budget (✅) AND line item baselines (✅)
4. Reject → No changes needed (already correct) (✅)
5. Recall → Rollback budget AND line item baselines (✅)
```

## Edge Cases to Handle

### Edge Case 1: Multiple Payments in Flight
**Scenario:** Payment #1 submitted but not approved, Payment #2 initiated  
**Solution:** SMS webhook should only reference APPROVED payments for "previous" lookup

### Edge Case 2: PM Adjusts Down
**Scenario:** Contractor submits 50%, PM adjusts to 40%  
**Solution:** UI should recalculate amounts automatically when PM edits percentages

### Edge Case 3: Reject Then Resubmit
**Scenario:** Payment #1 rejected, contractor creates Payment #2  
**Solution:** Payment #2 references last APPROVED payment, ignoring rejected #1

### Edge Case 4: Recall After Budget Spent
**Scenario:** Payment approved → budget allocated → payment recalled  
**Solution:** Recall should reduce project.spent and contractor.paid_to_date

### Edge Case 5: First Payment (No Previous)
**Scenario:** First payment for a line item  
**Solution:** `from_previous_application` = 0, validation allows any % 0-100

### Edge Case 6: Zero Progress This Period
**Scenario:** Contractor submits same % as previous (no new work)  
**Solution:** Should be allowed, `this_period` = 0%

### Edge Case 7: Sequential Approvals
**Scenario:** Payment #1 approved at 30%, Payment #2 submitted at 50%  
**Solution:** Payment #2's "previous" should show 30% from approved #1

## Implementation Plan

### Step 1: Remove Premature Updates from SMS Webhook
**File:** `src/app/api/sms/webhook/route.ts`  
**Lines:** 232-240

**Current Code:**
```typescript
const updatePromises = [
  supabase
    .from('payment_line_item_progress')
    .update({ /* ... */ })
    .eq('payment_app_id', conv.payment_app_id)
    .eq('line_item_id', lineItemId),
  
  supabase
    .from('project_line_items')  // ❌ Remove this
    .update({ 
      percent_completed: currentPercent,
      this_period: currentPercent,
      amount_for_this_period: amountForThisPeriod,
      from_previous_application: previousPercentFloat
    })
    .eq('id', lineItemId)
];
```

**Fixed Code:**
```typescript
// Only update payment_line_item_progress during SMS submission
await supabase
  .from('payment_line_item_progress')
  .update({ 
    previous_percent: prevPercent,
    this_period_percent: percent,
    submitted_percent: percent,
    calculated_amount: amountForThisPeriod
  })
  .eq('payment_app_id', conv.payment_app_id)
  .eq('line_item_id', lineItemId);

// Do NOT update project_line_items here - wait for approval
```

### Step 2: Fix Previous Percentage Lookup in SMS Webhook
**File:** `src/app/api/sms/webhook/route.ts`  
**Lines:** 177-184, 253-260

**Current Code:**
```typescript
const { data: allPrevProgress, error: prevError } = await supabase
  .from('payment_line_item_progress')
  .select('submitted_percent, payment_app_id')
  .eq('line_item_id', lineItemId)
  .gt('submitted_percent', 0)
  .neq('payment_app_id', conv.payment_app_id)  // ❌ Gets ALL payments
  .order('payment_app_id', { ascending: false })
  .limit(1);
```

**Fixed Code:**
```typescript
// Get the most recent APPROVED payment's percentage
const { data: approvedPayments } = await supabase
  .from('payment_applications')
  .select('id')
  .eq('project_id', conv.project_id)  // Need to add project_id to conversation
  .eq('contractor_id', conv.contractor_id)
  .eq('status', 'approved')
  .order('approved_at', { ascending: false });

let prevPercent = 0;
if (approvedPayments && approvedPayments.length > 0) {
  const { data: progress } = await supabase
    .from('payment_line_item_progress')
    .select('pm_verified_percent')
    .eq('payment_app_id', approvedPayments[0].id)
    .eq('line_item_id', lineItemId)
    .single();
  
  prevPercent = Number(progress?.pm_verified_percent) || 0;
}
```

### Step 3: Update Approve API to Set Line Item Baselines
**File:** `src/app/api/payments/[id]/approve/route.ts`  
**After:** Line 151 (after updating contractor paid_to_date)

**Add:**
```typescript
// Update project_line_items baselines after approval
const { data: lineItemProgress } = await supabase
  .from('payment_line_item_progress')
  .select('line_item_id, pm_verified_percent')
  .eq('payment_app_id', paymentAppId);

if (lineItemProgress && lineItemProgress.length > 0) {
  const updates = lineItemProgress.map(progress => ({
    id: progress.line_item_id,
    from_previous_application: progress.pm_verified_percent,
    percent_completed: progress.pm_verified_percent,
    updated_at: new Date().toISOString()
  }));

  // Batch update line items
  for (const update of updates) {
    await supabase
      .from('project_line_items')
      .update({
        from_previous_application: update.from_previous_application,
        percent_completed: update.percent_completed,
        updated_at: update.updated_at
      })
      .eq('id', update.id);
  }
  
  console.log(`Updated ${updates.length} line item baselines after approval`);
}
```

### Step 4: Update Reject API (Verification Only)
**File:** `src/app/api/payments/[id]/reject/route.ts`  
**Action:** No changes needed

**Reason:** Since we're removing the premature updates in Step 1, rejected payments will no longer modify `project_line_items`, so no rollback is necessary.

### Step 5: Add Rollback Logic to Recall API
**File:** `src/app/api/payments/[id]/recall/route.ts`  
**After:** Line 57 (after updating payment status)

**Add:**
```typescript
// Rollback project budget and contractor paid_to_date
if (paymentApp.current_period_value) {
  // Recalculate project spent
  const { data: approvedPayments } = await supabase
    .from('payment_applications')
    .select('current_period_value')
    .eq('project_id', paymentApp.project_id)
    .eq('status', 'approved')
    .neq('id', paymentAppId);  // Exclude the recalled payment

  const totalSpent = (approvedPayments || []).reduce((sum, p) => sum + (p.current_period_value || 0), 0);
  
  await supabase
    .from('projects')
    .update({ spent: totalSpent })
    .eq('id', paymentApp.project_id);

  // Recalculate contractor paid_to_date
  const { data: contractorPayments } = await supabase
    .from('payment_applications')
    .select('current_period_value')
    .eq('project_id', paymentApp.project_id)
    .eq('contractor_id', paymentApp.contractor_id)
    .eq('status', 'approved')
    .neq('id', paymentAppId);  // Exclude the recalled payment

  const contractorTotalPaid = (contractorPayments || []).reduce((sum, p) => sum + (p.current_period_value || 0), 0);
  
  await supabase
    .from('project_contractors')
    .update({ paid_to_date: contractorTotalPaid })
    .eq('project_id', paymentApp.project_id)
    .eq('contractor_id', paymentApp.contractor_id);

  console.log(`Rolled back budget for recalled payment ${paymentAppId}`);
}

// Rollback line item baselines to previous approved state
const { data: lineItemProgress } = await supabase
  .from('payment_line_item_progress')
  .select('line_item_id')
  .eq('payment_app_id', paymentAppId);

if (lineItemProgress && lineItemProgress.length > 0) {
  // For each line item, find the previous approved percentage
  for (const progress of lineItemProgress) {
    const { data: approvedPayments } = await supabase
      .from('payment_applications')
      .select('id, approved_at')
      .eq('project_id', paymentApp.project_id)
      .eq('contractor_id', paymentApp.contractor_id)
      .eq('status', 'approved')
      .neq('id', paymentAppId)
      .order('approved_at', { ascending: false })
      .limit(1);

    let previousPercent = 0;
    if (approvedPayments && approvedPayments.length > 0) {
      const { data: prevProgress } = await supabase
        .from('payment_line_item_progress')
        .select('pm_verified_percent')
        .eq('payment_app_id', approvedPayments[0].id)
        .eq('line_item_id', progress.line_item_id)
        .single();
      
      previousPercent = Number(prevProgress?.pm_verified_percent) || 0;
    }

    // Revert line item to previous approved state
    await supabase
      .from('project_line_items')
      .update({
        from_previous_application: previousPercent,
        percent_completed: previousPercent,
        updated_at: new Date().toISOString()
      })
      .eq('id', progress.line_item_id);
  }
  
  console.log(`Rolled back ${lineItemProgress.length} line item baselines for recalled payment ${paymentAppId}`);
}
```

### Step 6: Add project_id and contractor_id to SMS Conversation
**File:** `src/app/api/payments/initiate/route.ts`  
**Line:** ~210 (when creating payment_sms_conversations)

**Add to insert:**
```typescript
await supabase.from('payment_sms_conversations').insert({
  // ... existing fields ...
  project_id: projectIdNum,      // Add this
  contractor_id: contractorIdNum  // Add this
});
```

**Note:** May need to add these columns to the table if they don't exist.

### Step 7: Update Payment Verification Page Amount Recalculation
**File:** `src/app/payments/[id]/verify/page.tsx`  
**Location:** `saveLineItemPercentage` function (lines 136-196)

**Add after successful update:**
```typescript
// Recalculate and display updated amounts immediately
const scheduledValue = lineItems.find(li => li.line_item_id === lineItemId)?.line_item?.scheduled_value || 0;
const thisPeriodPercent = updatedData.pm_verified_percent - (previousPercentages[lineItemId] || 0);
const thisPeriodAmount = (thisPeriodPercent / 100) * scheduledValue;

console.log(`Recalculated: ${thisPeriodPercent}% = $${thisPeriodAmount} for line item ${lineItemId}`);
```

## Testing Plan

### Test 1: Normal Approval Flow
1. Initiate payment → SMS submission → PM review → Approve
2. Verify `project_line_items.from_previous_application` is updated
3. Verify budget and paid_to_date are correct
4. Create second payment for same contractor
5. Verify SMS shows correct "previous" percentage

### Test 2: Rejection Flow
1. Initiate payment → SMS submission → PM review → Reject
2. Verify `project_line_items` is unchanged
3. Verify budget is unchanged
4. Create new payment
5. Verify SMS shows previous approved percentage (not rejected one)

### Test 3: Recall Flow
1. Approve payment #1
2. Verify budget updated
3. Recall payment #1
4. Verify budget rolled back
5. Verify line item baselines reverted

### Test 4: Multiple Payments In Flight
1. Submit payment #1 (don't approve)
2. Initiate payment #2
3. Verify payment #2 SMS shows only approved percentages

### Test 5: PM Adjustments
1. Contractor submits 50%
2. PM adjusts to 40%
3. Approve at 40%
4. Verify line items show 40% as baseline
5. Next payment should show "previous: 40%"

### Test 6: Zero Progress
1. Previous approved at 30%
2. Contractor submits 30% (no progress)
3. Verify allowed
4. Verify this_period = 0%

### Test 7: First Payment
1. New line item (no previous payments)
2. Contractor can submit any % 0-100
3. After approval, that % becomes baseline

## Files to Modify

1. `src/app/api/sms/webhook/route.ts` - Remove premature updates, fix previous lookup
2. `src/app/api/payments/[id]/approve/route.ts` - Add line item baseline updates
3. `src/app/api/payments/[id]/recall/route.ts` - Add rollback logic
4. `src/app/api/payments/initiate/route.ts` - Add project_id/contractor_id to conversations
5. `src/app/payments/[id]/verify/page.tsx` - Add amount recalculation (optional enhancement)

## Database Changes Needed

Check if `payment_sms_conversations` table needs columns:
- `project_id` (INTEGER REFERENCES projects(id))
- `contractor_id` (INTEGER REFERENCES contractors(id))

If missing, add migration:
```sql
ALTER TABLE payment_sms_conversations 
  ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id),
  ADD COLUMN IF NOT EXISTS contractor_id INTEGER REFERENCES contractors(id);
```

## Success Criteria

✅ SMS submission does NOT modify `project_line_items`  
✅ Only approved payments update `from_previous_application`  
✅ Rejected payments have no impact on master line items  
✅ Recalled payments rollback budget and line item baselines  
✅ Multiple payments in flight reference only approved data  
✅ PM adjustments are reflected correctly  
✅ Cumulative payment tracking works across multiple payment cycles






