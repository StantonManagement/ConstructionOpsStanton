# PRD-01: Project Detail Page Fixes

## Overview
**Priority:** Critical (Blocking Core Workflow)  
**Estimated Time:** 2-3 days  
**Dependencies:** None  

The Project Detail page is the hub for project-level work but has several broken/incomplete features that undermine user confidence and block the contractor-centric workflow.

---

## Issues to Address

### Issue 1: Budget Cards Display $0
**Severity:** High - Makes the app look broken  
**Current:** All four budget cards show $0  
**Expected:** Cards show real calculated values from database  

### Issue 2: Wrong Default Tab
**Severity:** Medium - Forces extra clicks on every visit  
**Current:** Details tab is default  
**Expected:** Contractors tab should be default (matches daily workflow)  

### Issue 3: Contractors Tab Empty
**Severity:** Critical - Core feature missing  
**Current:** Tab shows nothing  
**Expected:** Draggable contractor cards with contract details  

### Issue 4: Remaining Label Unclear
**Severity:** Low - Causes confusion  
**Current:** "Available budget" subtitle  
**Expected:** "Unallocated budget" or "Budget remaining"  

### Issue 5: Payments Tab Not Implemented
**Severity:** Medium - Feature incomplete  
**Current:** Empty tab  
**Expected:** Payment applications filtered to this project  

---

## Phase 1: Fix Budget Card Calculations

### Files to Modify
```
src/app/components/ProjectDetailView.tsx
src/app/api/projects/[id]/summary/route.ts (create if needed)
```

### Implementation

**Step 1.1: Create/Update Summary API Endpoint**

Create `src/app/api/projects/[id]/summary/route.ts`:

```typescript
// Endpoint: GET /api/projects/[id]/summary
// Returns: { budget, spent, committed, remaining }

// Query logic:
// 1. Get project.budget from projects table
// 2. Sum project_contractors.paid_to_date for this project -> spent
// 3. Sum payment_applications.amount where status='approved' AND paid=false -> committed  
// 4. Calculate: remaining = budget - spent - committed
```

**Step 1.2: Update ProjectDetailView to Fetch Summary**

Replace hardcoded $0 values with API call:

```typescript
// In ProjectDetailView.tsx
const [summary, setSummary] = useState({
  budget: 0,
  spent: 0, 
  committed: 0,
  remaining: 0
});

useEffect(() => {
  fetch(`/api/projects/${projectId}/summary`)
    .then(res => res.json())
    .then(data => setSummary(data));
}, [projectId]);
```

**Step 1.3: Update Card Display**

Map summary values to the four cards:
- Card 1: "Total Budget" → `summary.budget`
- Card 2: "Spent" → `summary.spent`
- Card 3: "Committed" → `summary.committed`
- Card 4: "Remaining" → `summary.remaining`

### Testing Checklist
- [ ] API endpoint returns correct budget from projects table
- [ ] Spent calculation matches sum of paid_to_date
- [ ] Committed calculation matches approved but unpaid applications
- [ ] Remaining = Budget - Spent - Committed
- [ ] Cards update when payments are made
- [ ] Cards handle $0 budget gracefully (no divide by zero)

---

## Phase 2: Change Default Tab

### Files to Modify
```
src/app/components/ProjectDetailView.tsx
```

### Implementation

**Step 2.1: Update Initial State**

Find the activeTab state initialization and change:

```typescript
// Before
const [activeTab, setActiveTab] = useState('details');

// After
const [activeTab, setActiveTab] = useState('contractors');
```

**Step 2.2: Verify Tab Order**

Ensure tabs render in logical order:
1. Contractors (default)
2. Payments
3. Budget
4. Details
5. Documents

### Testing Checklist
- [ ] Opening any project lands on Contractors tab
- [ ] Tab highlight shows Contractors as active
- [ ] URL doesn't break (if using URL-based tab state)
- [ ] Back button behavior is correct

---

## Phase 3: Implement Contractors Tab

### Files to Create/Modify
```
src/app/components/ProjectDetailView.tsx
src/app/components/project/ContractorCard.tsx (new)
src/app/api/projects/[id]/contractors/route.ts
```

### Database Query

```sql
SELECT 
  pc.id,
  pc.project_id,
  pc.contractor_id,
  pc.original_contract_amount,
  pc.contract_amount,
  pc.paid_to_date,
  pc.display_order,
  c.name as contractor_name,
  c.phone,
  c.email,
  c.trade,
  (SELECT COUNT(*) FROM contract_line_items cli WHERE cli.project_contractor_id = pc.id) as line_item_count,
  (SELECT COALESCE(SUM(pa.amount), 0) 
   FROM payment_applications pa 
   WHERE pa.project_id = pc.project_id 
   AND pa.contractor_id = pc.contractor_id 
   AND pa.status = 'approved'
   AND pa.paid = false) as pending_approved
FROM project_contractors pc
JOIN contractors c ON c.id = pc.contractor_id
WHERE pc.project_id = $1
ORDER BY pc.display_order ASC, pc.created_at ASC
```

### ContractorCard Component Design

```
┌─────────────────────────────────────────────────────────────────┐
│ ≡  ABC Plumbing                                    Plumbing     │
│    (555) 123-4567 • contact@abcplumbing.com                     │
├─────────────────────────────────────────────────────────────────┤
│  Original        Change Orders      Current Contract            │
│  $45,000         +$3,200 (orange)   $48,200                     │
├─────────────────────────────────────────────────────────────────┤
│  ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░  62%            │
│  Paid: $30,000 (62%)  |  Approved: $5,000  |  Remaining: $13,200│
├─────────────────────────────────────────────────────────────────┤
│  [View Breakdown]  [Request Payment]  [Add Change Order]        │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Steps

**Step 3.1: Create API Endpoint**

`src/app/api/projects/[id]/contractors/route.ts`
- GET: Return contractors with calculated fields
- PATCH: Update display_order for drag-and-drop

**Step 3.2: Create ContractorCard Component**

Props:
```typescript
interface ContractorCardProps {
  contractor: {
    id: string;
    contractorId: string;
    name: string;
    phone: string;
    email: string;
    trade: string;
    originalAmount: number;
    currentAmount: number;
    paidToDate: number;
    pendingApproved: number;
    displayOrder: number;
  };
  onRequestPayment: () => void;
  onAddChangeOrder: () => void;
  onViewBreakdown: () => void;
  isDragging?: boolean;
}
```

**Step 3.3: Implement Drag-and-Drop**

Use @dnd-kit (already installed):

```typescript
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';

// Wrap contractor list in DndContext
// Each ContractorCard wrapped in useSortable
// On drag end: 
//   1. Optimistically reorder state
//   2. PATCH /api/projects/[id]/contractors with new order
//   3. Revert on error
```

**Step 3.4: Add "Add Contractor" Button**

Below the contractor cards:
```typescript
<button onClick={() => setShowAddContractorModal(true)}>
  + Add Contractor to Project
</button>
```

Modal should:
- Show dropdown of existing contractors (not already on project)
- Input for contract amount
- Option to create new contractor inline

### Testing Checklist
- [ ] Contractors load and display correctly
- [ ] All money values formatted properly ($XX,XXX.XX)
- [ ] Progress bar percentage is accurate
- [ ] Change Orders show in orange when non-zero
- [ ] Drag-and-drop reorders cards
- [ ] New order persists after page refresh
- [ ] "Request Payment" opens payment modal with contractor pre-selected
- [ ] "Add Change Order" opens CO modal with contractor pre-selected
- [ ] "View Breakdown" navigates to contractor detail or expands inline
- [ ] Add Contractor button works
- [ ] Empty state shows helpful message

---

## Phase 4: Fix Remaining Label

### Files to Modify
```
src/app/components/ProjectDetailView.tsx
```

### Implementation

Find the Remaining card and update subtitle:

```typescript
// Before
<p className="text-sm text-gray-500">Available budget</p>

// After  
<p className="text-sm text-gray-500">Budget remaining</p>
```

### Testing Checklist
- [ ] Label reads "Budget remaining" or "Unallocated budget"

---

## Phase 5: Implement Payments Tab

### Files to Modify
```
src/app/components/ProjectDetailView.tsx
src/app/components/project/ProjectPaymentsTab.tsx (new)
```

### Implementation

**Step 5.1: Create ProjectPaymentsTab Component**

Reuse existing PaymentApplicationsView logic but filtered:

```typescript
// Query: GET /api/payment-applications?projectId={projectId}
// Display same card format as main Payments view
// Actions based on status: Review, Approve, Reject, View
```

**Step 5.2: Wire Up to Tab**

```typescript
{activeTab === 'payments' && (
  <ProjectPaymentsTab projectId={projectId} />
)}
```

### Testing Checklist
- [ ] Only shows payments for current project
- [ ] Status badges display correctly
- [ ] Action buttons work (Approve, Reject, View)
- [ ] Empty state shows "No payment applications yet"
- [ ] New payment appears after creation

---

## Completion Criteria

All items must pass before marking complete:

- [ ] Budget cards show real data, not $0
- [ ] Contractors tab is default on load
- [ ] Contractor cards display with all fields
- [ ] Drag-and-drop reordering works
- [ ] Payments tab shows project-specific payments
- [ ] No console errors
- [ ] Mobile responsive (test at 375px width)
- [ ] Loading states for all async operations
