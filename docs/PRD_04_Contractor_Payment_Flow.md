# PRD-04: Contractor → Payment Flow

## Overview
**Priority:** High (Core Workflow)  
**Estimated Time:** 2-3 days  
**Dependencies:** PRD-01 (Contractors Tab)  

The primary user workflow is: find contractor → request payment → approve → pay. Currently this requires navigating between multiple views and manually connecting data. This PRD streamlines the contractor-to-payment journey.

---

## Problem Statement

Current friction points:
1. **From Contractor Card**: "Request Payment" button exists but may not pre-fill correctly
2. **No inline payment history**: Must navigate away to see contractor's payment history
3. **No quick-view of pending**: Can't see if contractor has pending requests without clicking
4. **Status unclear**: Is this contractor waiting for approval? Paid up? Owed money?

---

## User Stories

**As a PM, I want to:**
1. See at a glance if a contractor has pending payment requests
2. Request a payment without leaving the project view
3. See contractor's payment history inline
4. Know immediately how much we owe each contractor

**As an admin, I want to:**
1. Approve payments directly from contractor context
2. See all pending payments for a contractor across projects
3. Mark payments as paid in bulk

---

## Wireframe: Enhanced Contractor Card

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ≡  ABC Plumbing                                              Plumbing  ▼   │
│    (555) 123-4567 • contact@abcplumbing.com                 [Expand/Collapse]
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Original Contract    Change Orders       Current Contract                  │
│  $45,000              +$3,200             $48,200                           │
│                       └─ 2 approved                                         │
│                                                                             │
│  ████████████████████████████░░░░░░░░░░░░░░░░░░░  68%                      │
│                                                                             │
│  Paid        Approved       Pending        Remaining                        │
│  $30,000     $3,000         $2,500         $12,700                          │
│  (62%)       (awaiting ✓)   (under review) (to complete)                    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  ⚡ QUICK STATUS                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🟡 PA-0052: $2,500 pending approval (submitted Dec 6)      [Review] │   │
│  │ ✅ PA-0048: $3,000 approved, awaiting payment              [Pay]    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [View Full History]  [Request Payment]  [Add Change Order]                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Enhanced Contractor Card Data

### Files to Modify
```
src/app/api/projects/[id]/contractors/route.ts
src/app/components/project/ContractorCard.tsx
```

### API Enhancement

Expand contractor query to include payment status:

```sql
SELECT 
  pc.*,
  c.name, c.phone, c.email, c.trade,
  
  -- Contract amounts
  pc.original_contract_amount,
  pc.contract_amount,
  pc.paid_to_date,
  
  -- Change order summary
  (SELECT COUNT(*) FROM change_orders co 
   WHERE co.project_id = pc.project_id 
   AND co.contractor_id = pc.contractor_id 
   AND co.status = 'approved') as approved_cos,
  
  (SELECT COALESCE(SUM(cost_impact), 0) FROM change_orders co 
   WHERE co.project_id = pc.project_id 
   AND co.contractor_id = pc.contractor_id 
   AND co.status = 'approved') as co_total,
  
  -- Payment application summary
  (SELECT COALESCE(SUM(amount), 0) FROM payment_applications pa
   WHERE pa.project_id = pc.project_id 
   AND pa.contractor_id = pc.contractor_id 
   AND pa.status = 'approved' 
   AND (pa.paid = false OR pa.paid IS NULL)) as approved_unpaid,
  
  (SELECT COALESCE(SUM(amount), 0) FROM payment_applications pa
   WHERE pa.project_id = pc.project_id 
   AND pa.contractor_id = pc.contractor_id 
   AND pa.status IN ('submitted', 'pending_review')) as pending_review,
  
  -- Recent payment apps for quick status
  (SELECT json_agg(recent_pas) FROM (
    SELECT pa.id, pa.amount, pa.status, pa.created_at,
           CONCAT('PA-', LPAD(pa.id::text, 4, '0')) as reference
    FROM payment_applications pa
    WHERE pa.project_id = pc.project_id 
    AND pa.contractor_id = pc.contractor_id
    AND pa.status NOT IN ('paid', 'rejected')
    ORDER BY pa.created_at DESC
    LIMIT 3
  ) recent_pas) as pending_payments

FROM project_contractors pc
JOIN contractors c ON c.id = pc.contractor_id
WHERE pc.project_id = $1
ORDER BY pc.display_order ASC
```

### Response Shape

```typescript
interface ContractorWithStatus {
  id: string;
  contractorId: string;
  name: string;
  phone: string;
  email: string;
  trade: string;
  
  // Amounts
  originalContractAmount: number;
  contractAmount: number;
  paidToDate: number;
  
  // Calculated
  approvedCOs: number;
  coTotal: number;
  approvedUnpaid: number;  // Ready to pay
  pendingReview: number;   // Under review
  remaining: number;       // contractAmount - paidToDate - approvedUnpaid - pendingReview
  
  // Quick status items
  pendingPayments: Array<{
    id: string;
    reference: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  
  displayOrder: number;
}
```

### Testing Checklist
- [ ] API returns all calculated fields
- [ ] Approved COs count and total are correct
- [ ] Pending payments array includes recent items
- [ ] Remaining calculation is accurate
- [ ] Empty states handled (no COs, no payments)

---

## Phase 2: Update Contractor Card UI

### Implementation

**Step 2.1: Four-Column Money Display**

Replace three-column with four:

```typescript
<div className="grid grid-cols-4 gap-4 text-center">
  <div>
    <div className="text-lg font-semibold">{formatCurrency(paid)}</div>
    <div className="text-xs text-gray-500">Paid ({paidPercent}%)</div>
  </div>
  <div>
    <div className="text-lg font-semibold text-green-600">
      {formatCurrency(approvedUnpaid)}
    </div>
    <div className="text-xs text-gray-500">Approved</div>
  </div>
  <div>
    <div className="text-lg font-semibold text-yellow-600">
      {formatCurrency(pendingReview)}
    </div>
    <div className="text-xs text-gray-500">Pending</div>
  </div>
  <div>
    <div className="text-lg font-semibold">{formatCurrency(remaining)}</div>
    <div className="text-xs text-gray-500">Remaining</div>
  </div>
</div>
```

**Step 2.2: Quick Status Section**

Collapsible section showing pending items:

```typescript
{pendingPayments.length > 0 && (
  <div className="border-t pt-3 mt-3">
    <div className="text-sm font-medium text-gray-700 mb-2">
      ⚡ Quick Status
    </div>
    {pendingPayments.map(pa => (
      <div key={pa.id} className="flex justify-between items-center py-1">
        <div className="flex items-center gap-2">
          <StatusBadge status={pa.status} />
          <span>{pa.reference}: {formatCurrency(pa.amount)}</span>
          <span className="text-gray-400 text-xs">
            ({formatRelativeDate(pa.createdAt)})
          </span>
        </div>
        <div className="flex gap-2">
          {pa.status === 'pending_review' && (
            <button onClick={() => openReview(pa.id)}>Review</button>
          )}
          {pa.status === 'approved' && (
            <button onClick={() => markPaid(pa.id)}>Pay</button>
          )}
        </div>
      </div>
    ))}
  </div>
)}
```

**Step 2.3: Progress Bar Enhancement**

Show multiple segments in progress bar:

```typescript
// Paid (dark green) + Approved (light green) + Pending (yellow) + Remaining (gray)
<div className="h-2 bg-gray-200 rounded-full overflow-hidden flex">
  <div 
    className="bg-green-600" 
    style={{ width: `${paidPercent}%` }}
  />
  <div 
    className="bg-green-300" 
    style={{ width: `${approvedPercent}%` }}
  />
  <div 
    className="bg-yellow-400" 
    style={{ width: `${pendingPercent}%` }}
  />
</div>
```

### Testing Checklist
- [ ] Four columns display correctly
- [ ] Quick Status section shows when items exist
- [ ] Quick Status hidden when no pending items
- [ ] Progress bar segments are proportional
- [ ] Colors match status (green=paid, light green=approved, yellow=pending)
- [ ] Review button opens payment review modal
- [ ] Pay button marks as paid

---

## Phase 3: Request Payment Modal Enhancement

### Files to Modify
```
src/app/components/modals/RequestPaymentModal.tsx
```

### Current Issues
- May not pre-fill contractor correctly
- Doesn't show contractor's remaining contract balance
- Doesn't warn if request exceeds remaining

### Implementation

**Step 3.1: Pre-fill from Context**

When opened from contractor card:

```typescript
interface RequestPaymentModalProps {
  projectId: string;
  contractor?: {
    id: string;
    name: string;
    contractAmount: number;
    paidToDate: number;
    approvedUnpaid: number;
    pendingReview: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

// If contractor prop provided, pre-select and show context
```

**Step 3.2: Context Panel**

Show contractor context in modal:

```
┌─────────────────────────────────────────────────────────────────┐
│  Request Payment                                           [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Contractor: ABC Plumbing (pre-selected, locked)                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Contract: $48,200  |  Paid: $30,000  |  Available: $18,200│   │
│  │ (Approved pending: $3,000 | Under review: $2,500)         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Amount Requested: $___________                                 │
│                    ⚠️ Max available: $12,700                    │
│                                                                 │
│  Description: [________________________________]                │
│                                                                 │
│  Line Items (optional):                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Budget Category     | % Complete | Amount               │   │
│  │ Rough Plumbing      | [75%]      | $3,000 (auto-calc)   │   │
│  │ Finish Plumbing     | [25%]      | $1,500 (auto-calc)   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                                    [Cancel]  [Submit Request]   │
└─────────────────────────────────────────────────────────────────┘
```

**Step 3.3: Validation Rules**

```typescript
const maxAvailable = contractor.contractAmount 
  - contractor.paidToDate 
  - contractor.approvedUnpaid 
  - contractor.pendingReview;

// Warnings (soft, allow override)
if (amount > maxAvailable * 0.5) {
  showWarning('This request is for more than 50% of remaining contract.');
}

// Errors (hard block)
if (amount > maxAvailable) {
  showError(`Amount exceeds available balance of ${formatCurrency(maxAvailable)}`);
  return;
}

if (amount <= 0) {
  showError('Amount must be greater than $0');
  return;
}
```

### Testing Checklist
- [ ] Contractor pre-selected when opened from card
- [ ] Context panel shows correct amounts
- [ ] Max available calculated correctly
- [ ] Warning shown for large requests
- [ ] Error prevents over-contract requests
- [ ] Submit creates payment application
- [ ] Success callback refreshes contractor card

---

## Phase 4: Inline Payment History

### Files to Create
```
src/app/components/project/ContractorPaymentHistory.tsx
```

### Implementation

Expandable section within contractor card:

```typescript
// "View Full History" button toggles expansion

{showHistory && (
  <div className="border-t mt-3 pt-3">
    <h4 className="text-sm font-medium mb-2">Payment History</h4>
    <table className="w-full text-sm">
      <thead>
        <tr className="text-gray-500 text-left">
          <th>Reference</th>
          <th>Date</th>
          <th>Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {paymentHistory.map(pa => (
          <tr key={pa.id} className="border-t">
            <td>{pa.reference}</td>
            <td>{formatDate(pa.createdAt)}</td>
            <td>{formatCurrency(pa.amount)}</td>
            <td><StatusBadge status={pa.status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
    {paymentHistory.length === 0 && (
      <p className="text-gray-400 text-center py-4">No payment history</p>
    )}
  </div>
)}
```

### API Addition

`GET /api/projects/[id]/contractors/[contractorId]/payments`

Returns all payment applications for this contractor on this project.

### Testing Checklist
- [ ] History expands/collapses
- [ ] All payments for contractor shown
- [ ] Sorted by date (newest first)
- [ ] Status badges match global styling
- [ ] Clicking row opens payment detail modal
- [ ] Empty state handled

---

## Phase 5: Quick Actions from Card

### Implementation

**Quick Approve (Admin Only)**

For pending items in the Quick Status section:

```typescript
const handleQuickApprove = async (paymentId: string) => {
  if (!confirm('Approve this payment?')) return;
  
  await fetch(`/api/payment-applications/${paymentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'approved' })
  });
  
  toast.success('Payment approved');
  refreshContractor();
};
```

**Quick Pay (Admin Only)**

```typescript
const handleQuickPay = async (paymentId: string) => {
  // Open minimal modal for check number (optional)
  setPayModalPayment(paymentId);
};

// Modal content
<dialog>
  <h3>Mark as Paid</h3>
  <p>Amount: {formatCurrency(payment.amount)}</p>
  <input placeholder="Check # (optional)" />
  <button onClick={confirmPaid}>Confirm Paid</button>
</dialog>
```

### Role-Based Visibility

```typescript
const { userRole } = useAuth();
const canApprove = ['admin', 'pm'].includes(userRole);
const canMarkPaid = userRole === 'admin';

// In Quick Status section
{canApprove && pa.status === 'pending_review' && (
  <button onClick={() => handleQuickApprove(pa.id)}>
    Approve
  </button>
)}

{canMarkPaid && pa.status === 'approved' && (
  <button onClick={() => handleQuickPay(pa.id)}>
    Mark Paid
  </button>
)}
```

### Testing Checklist
- [ ] Quick Approve visible to admin/PM only
- [ ] Quick Pay visible to admin only
- [ ] Actions update card immediately
- [ ] Toast notifications confirm actions
- [ ] Actions logged for audit trail

---

## Phase 6: Contractor Detail Drawer

### Files to Create
```
src/app/components/project/ContractorDrawer.tsx
```

### Implementation

Instead of navigating away, open a slide-out drawer:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Main Content Area                              │  ┌──────────────────────┐ │
│                                                │  │ ABC Plumbing     [X] │ │
│ [Contractor cards...]                          │  │ Plumbing             │ │
│                                                │  ├──────────────────────┤ │
│                                                │  │ Contract Details     │ │
│                                                │  │ Original: $45,000    │ │
│                                                │  │ COs: +$3,200         │ │
│                                                │  │ Current: $48,200     │ │
│                                                │  │                      │ │
│                                                │  │ Payment Summary      │ │
│                                                │  │ [Progress visual]    │ │
│                                                │  │                      │ │
│                                                │  │ Change Orders        │ │
│                                                │  │ [List of COs]        │ │
│                                                │  │                      │ │
│                                                │  │ Payment History      │ │
│                                                │  │ [Full history table] │ │
│                                                │  │                      │ │
│                                                │  │ [Request Payment]    │ │
│                                                │  │ [Add Change Order]   │ │
│                                                │  └──────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

Triggered by clicking contractor card (not buttons).

Width: 400px on desktop, full-screen on mobile.

### Testing Checklist
- [ ] Drawer opens on card click
- [ ] Drawer closes on X or outside click
- [ ] Drawer closes on Escape key
- [ ] All contractor data displays
- [ ] Actions work from within drawer
- [ ] Mobile shows full-screen
- [ ] Smooth animation in/out

---

## Completion Criteria

- [ ] Contractor cards show payment status inline
- [ ] Quick Status section shows pending items
- [ ] Request Payment pre-fills contractor context
- [ ] Amount validation prevents over-contract requests
- [ ] Payment history expandable in card
- [ ] Quick actions work (Approve, Pay)
- [ ] Role-based visibility correct
- [ ] Drawer provides full contractor details
- [ ] No navigation required for common workflows
- [ ] Mobile responsive
- [ ] No console errors
