# Manual Payment Application Entry - Testing Guide

## Feature Overview

This feature allows PMs and Admins to create payment applications by manually entering line item completion percentages, bypassing the SMS contractor flow. This is useful when progress data is already known.

## Implementation Summary

### Files Created/Modified

1. **NEW: `src/app/components/ManualPaymentEntryModal.tsx`**
   - Modal component for entering line item percentages
   - Shows all line items with previous percentages
   - Validates that current percentages >= previous percentages
   - Calculates totals dynamically as user enters data
   - Includes PM notes field

2. **NEW: `src/app/api/payments/create-manual/route.ts`**
   - API endpoint: `POST /api/payments/create-manual`
   - Creates payment application with status='submitted'
   - Creates payment_line_item_progress records
   - Validates all inputs and business rules

3. **MODIFIED: `src/app/components/SubcontractorSelectionView.tsx`**
   - Added "Create Payment App Manually" button (appears when exactly 1 contractor selected)
   - Button shown alongside "Send via SMS" option
   - Opens ManualPaymentEntryModal with selected contractor context

## Testing Checklist

### Phase 1: Access the Feature
- [ ] Login as Admin or PM user
- [ ] Navigate to Projects tab
- [ ] Select a project with contractors and line items
- [ ] Click on project to initiate payment application flow
- [ ] Verify you see contractor selection screen

### Phase 2: Manual Entry UI
- [ ] Select **exactly one contractor** from the list
- [ ] Verify "Create Payment App Manually" button appears (green button with ✏️ icon)
- [ ] Click the "Create Payment App Manually" button
- [ ] Modal should open with title "Create Payment Application"
- [ ] Verify modal shows: Project Name • Contractor Name

### Phase 3: Line Items Display
- [ ] Verify all line items for the contractor are displayed
- [ ] Each line item should show:
  - Item number and description
  - Scheduled value (including change orders if any)
  - Previous percentage (from prior payment apps)
  - Input field for current percentage
  - Calculated "This Period" amount
- [ ] Verify totals row shows correct sums

### Phase 4: Data Entry Validation

#### Test Case 1: Valid Entry
- [ ] Enter percentages >= previous percentages
- [ ] Ensure at least one line item has progress
- [ ] Click "Create Payment Application"
- [ ] Should redirect to verification page
- [ ] Payment app should have status='submitted'

#### Test Case 2: Invalid Percentages (Too Low)
- [ ] Enter percentage < previous percentage
- [ ] Click "Create Payment Application"
- [ ] Should show error: "Cannot be less than previous X%"
- [ ] Should not create payment app

#### Test Case 3: Invalid Percentages (Out of Range)
- [ ] Enter percentage > 100 or < 0
- [ ] Click "Create Payment Application"
- [ ] Should show error: "Must be between 0-100%"
- [ ] Should not create payment app

#### Test Case 4: No Progress
- [ ] Enter same percentages as previous (no progress)
- [ ] Click "Create Payment Application"
- [ ] Should show error: "At least one line item must have progress"
- [ ] Should not create payment app

### Phase 5: Calculations Verification
- [ ] Enter various percentages
- [ ] Verify "This Period" column updates in real-time
- [ ] Verify totals row calculates correctly
- [ ] Verify Payment Summary card shows:
  - Total Contract (sum of all scheduled values)
  - Previous Payments (based on previous percentages)
  - Current Payment (this period amount)
  - Total Paid To Date (cumulative)

### Phase 6: PM Notes
- [ ] Enter text in "PM Notes" field
- [ ] Verify it's optional (can leave blank)
- [ ] Verify notes are saved with payment app

### Phase 7: Payment Application Creation
- [ ] Submit valid data
- [ ] Verify API call succeeds
- [ ] Check payment_applications table:
  ```sql
  SELECT id, project_id, contractor_id, status, current_payment, pm_notes
  FROM payment_applications
  WHERE status = 'submitted'
  ORDER BY created_at DESC
  LIMIT 1;
  ```
- [ ] Verify status is 'submitted' (not 'initiated' or 'sms_sent')
- [ ] Verify current_payment is calculated correctly

### Phase 8: Line Item Progress Records
- [ ] Check payment_line_item_progress table:
  ```sql
  SELECT 
    plip.*,
    pli.description_of_work,
    pli.from_previous_application
  FROM payment_line_item_progress plip
  JOIN project_line_items pli ON plip.line_item_id = pli.id
  WHERE plip.payment_app_id = [PAYMENT_APP_ID]
  ORDER BY pli.item_no;
  ```
- [ ] Verify each line item has a progress record
- [ ] Verify submitted_percent matches entered value
- [ ] Verify pm_verified_percent = submitted_percent (initially)
- [ ] Verify previous_percent matches from_previous_application
- [ ] Verify this_period_percent = submitted_percent - previous_percent
- [ ] Verify calculated_amount is correct

### Phase 9: Verification Page Flow
- [ ] After creation, should redirect to `/payments/[id]/verify`
- [ ] Verify all entered data displays correctly
- [ ] Verify line items show correct percentages
- [ ] Verify PM can edit percentages if needed
- [ ] Verify PM can add notes
- [ ] Verify can proceed to approve/reject

### Phase 10: PDF Generation
- [ ] On verification page, click "Generate PDF" button
- [ ] Verify G-703 form generates correctly
- [ ] Verify all line items appear
- [ ] Verify totals are correct
- [ ] Verify contractor and project info is correct
- [ ] Download and review PDF

### Phase 11: Approval Flow
- [ ] After verification, click "Approve"
- [ ] Verify payment app status changes to 'approved'
- [ ] Verify project_line_items.from_previous_application updates for next payment
- [ ] Verify paid_to_date updates correctly

### Phase 12: Edge Cases

#### No Line Items
- [ ] Select contractor with no line items
- [ ] Click "Create Payment App Manually"
- [ ] Should show error: "No line items found"
- [ ] Should not allow submission

#### Multiple Contractors Selected
- [ ] Select 2 or more contractors
- [ ] Verify "Create Payment App Manually" button is hidden
- [ ] Only "Send via SMS" button should be available

#### Modal Dismissal
- [ ] Open modal
- [ ] Click "Cancel" button
- [ ] Modal should close without creating payment app
- [ ] Click "X" button in top right
- [ ] Modal should close

#### Network Errors
- [ ] Open modal with network disconnected
- [ ] Enter valid data
- [ ] Click submit
- [ ] Should show appropriate error message
- [ ] Should not navigate away

### Phase 13: Comparison with SMS Flow

Create two payment apps for the same contractor (different periods):
1. One via manual entry
2. One via SMS

Compare:
- [ ] Both should reach 'submitted' status
- [ ] Both should appear in PM's review queue
- [ ] Both should have same data structure
- [ ] Both should flow through verification → PDF → approval identically
- [ ] No differences in final approved state

## Expected Database State

### After Manual Entry Creation

**payment_applications table:**
```sql
id: [auto-generated]
project_id: [selected project]
contractor_id: [selected contractor]
status: 'submitted'  -- Not 'initiated' or 'sms_sent'
total_contract_amount: [from contracts]
current_payment: [calculated from line items]
payment_period_end: [current date]
pm_notes: [entered text or NULL]
sms_conversation_id: NULL  -- No SMS involved
created_at: [timestamp]
```

**payment_line_item_progress table:**
```sql
payment_app_id: [created payment app ID]
line_item_id: [project line item ID]
submitted_percent: [entered value]
pm_verified_percent: [same as submitted initially]
previous_percent: [from project_line_items.from_previous_application]
this_period_percent: [submitted - previous]
calculated_amount: [scheduled_value * this_period_percent / 100]
```

## Performance Considerations

- [ ] Modal loads line items quickly (< 1 second for 50+ line items)
- [ ] Percentage input updates are smooth (no lag)
- [ ] Total calculations are instant
- [ ] API call completes in reasonable time (< 3 seconds)
- [ ] No memory leaks when opening/closing modal multiple times

## Browser Compatibility

Test in:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Mobile browsers (responsive design)

## Success Criteria

✅ Feature is successful if:
1. PM can create payment app without SMS in under 2 minutes
2. All validations work correctly
3. Payment app flows through normal approval process
4. PDF generation works identically to SMS-created apps
5. No data inconsistencies compared to SMS flow
6. UI is intuitive and requires no training

## Known Limitations

- Only works for contractors with existing line items
- Cannot create payment app for multiple contractors at once
- Previous percentages must be set (usually from prior payment apps)
- Requires manual data entry (no import from external source)

## Future Enhancements

- Bulk entry for multiple contractors
- Import from CSV/Excel
- Auto-populate percentages from inspection data
- Templates for common completion patterns
- Copy percentages from previous payment app

## Rollback Plan

If issues are discovered:
1. Feature can be disabled by removing/commenting button in SubcontractorSelectionView
2. API route can be disabled by returning 503
3. Modal component can be removed
4. Existing SMS flow remains unaffected
5. No database migrations needed (uses existing schema)

## Testing Completed By

- [ ] Developer: _______________ Date: _______________
- [ ] QA: _______________ Date: _______________
- [ ] PM/Product Owner: _______________ Date: _______________

## Notes

[Add any observations, issues, or recommendations here]

