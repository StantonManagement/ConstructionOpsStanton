# PRD-02: Today's Queue Dashboard

## Overview
**Priority:** High (Core Workflow Enhancement)  
**Estimated Time:** 2-3 days  
**Dependencies:** PRD-01 (Budget calculations)  

The current app lacks a "what needs my attention today?" landing page. Users must navigate to different sections to find pending work. This PRD creates a centralized action queue that surfaces the most urgent items.

---

## Problem Statement

Your workflow is contractor-payment-centric: "which contractor needs to get paid for which projects today?" But currently:

1. No single view shows pending approvals across all projects
2. No prioritization of urgent vs routine items
3. User must check multiple tabs to find what needs action
4. No visibility into overdue items or bottlenecks

---

## Solution: Operations Dashboard

A new default landing page that answers:
- What payments need approval today?
- What's overdue or stuck?
- What changed since I last looked?
- Quick stats on overall status

---

## Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Construction Operations Center                      [🔍 Search] [👤 User]  │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Dashboard] [Projects] [Payments] [Contractors] [Change Orders] [Settings] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Good morning, Alex                                    Monday, Dec 8, 2025  │
│                                                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌────────────┐│
│  │ Needs Approval  │ │ Pending Payment │ │ Overdue Items   │ │ This Week  ││
│  │      🔴 7       │ │      🟡 4       │ │      🔴 2       │ │   $47,200  ││
│  │ $32,450 total   │ │ $18,900 total   │ │ 3+ days old     │ │  approved  ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ └────────────┘│
│                                                                             │
│  ══════════════════════════════════════════════════════════════════════════│
│  ACTION QUEUE                                          [Filter ▼] [Sort ▼] │
│  ══════════════════════════════════════════════════════════════════════════│
│                                                                             │
│  🔴 URGENT (2)                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ PA-0047 • ABC Plumbing • 123 Main St           $8,500   [Review] [✓]  ││
│  │ Submitted 5 days ago • Rough plumbing complete                         ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │ PA-0051 • XYZ Electric • 456 Oak Ave           $12,200  [Review] [✓]  ││
│  │ Submitted 4 days ago • Panel upgrade                                   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  🟡 NEEDS REVIEW (5)                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ PA-0052 • DEF Drywall • 123 Main St            $4,750   [Review] [✓]  ││
│  │ Submitted today • Bedroom drywall hung                                 ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │ CO-0018 • ABC Plumbing • 789 Pine Rd           +$1,200  [Review] [✓]  ││
│  │ Hidden water damage repair                                             ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ✅ READY TO PAY (4)                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ PA-0044 • GHI Flooring • 123 Main St           $6,400   [Mark Paid]   ││
│  │ Approved Dec 5 • Awaiting check                                        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ──────────────────────────────────────────────────────────────────────────│
│  RECENT ACTIVITY                                              [View All →] │
│  ──────────────────────────────────────────────────────────────────────────│
│  • PA-0050 approved by PM ($3,200) - 2 hours ago                           │
│  • New payment request from ABC Plumbing - 4 hours ago                     │
│  • CO-0017 approved ($800) - yesterday                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Create Dashboard Route & Layout

### Files to Create
```
src/app/dashboard/page.tsx
src/app/components/dashboard/DashboardView.tsx
src/app/components/dashboard/StatCard.tsx
src/app/components/dashboard/ActionQueue.tsx
src/app/components/dashboard/ActionItem.tsx
src/app/components/dashboard/RecentActivity.tsx
```

### Implementation

**Step 1.1: Create Dashboard Page**

`src/app/dashboard/page.tsx`:
```typescript
import DashboardView from '@/app/components/dashboard/DashboardView';

export default function DashboardPage() {
  return <DashboardView />;
}
```

**Step 1.2: Update Navigation**

Add Dashboard as first nav item, make it the landing page:

```typescript
// In main layout or navigation component
const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: Building2 },
  // ... rest
];
```

**Step 1.3: Redirect Root to Dashboard**

`src/app/page.tsx`:
```typescript
import { redirect } from 'next/navigation';
export default function Home() {
  redirect('/dashboard');
}
```

### Testing Checklist
- [ ] /dashboard route loads
- [ ] Navigation shows Dashboard as first item
- [ ] Root URL redirects to /dashboard
- [ ] Dashboard tab is highlighted when active

---

## Phase 2: Dashboard Summary API

### Files to Create
```
src/app/api/dashboard/summary/route.ts
```

### API Design

**Endpoint:** `GET /api/dashboard/summary`

**Response:**
```typescript
{
  needsApproval: {
    count: number;
    totalAmount: number;
  };
  pendingPayment: {
    count: number;
    totalAmount: number;
  };
  overdueItems: {
    count: number;
    oldestDays: number;
  };
  thisWeek: {
    approvedAmount: number;
    paidAmount: number;
  };
}
```

### Query Logic

```sql
-- Needs Approval: Payment apps with status = 'submitted' or 'pending_review'
SELECT COUNT(*), COALESCE(SUM(amount), 0) as total
FROM payment_applications 
WHERE status IN ('submitted', 'pending_review');

-- Pending Payment: Approved but not paid
SELECT COUNT(*), COALESCE(SUM(amount), 0) as total
FROM payment_applications
WHERE status = 'approved' AND (paid = false OR paid IS NULL);

-- Overdue: Submitted more than 3 days ago, not yet approved
SELECT COUNT(*), 
       EXTRACT(DAY FROM NOW() - MIN(created_at)) as oldest_days
FROM payment_applications
WHERE status IN ('submitted', 'pending_review')
AND created_at < NOW() - INTERVAL '3 days';

-- This Week: Sum of approved amounts this week
SELECT COALESCE(SUM(amount), 0) as approved
FROM payment_applications
WHERE status = 'approved'
AND updated_at >= DATE_TRUNC('week', NOW());
```

### Testing Checklist
- [ ] API returns correct counts
- [ ] Amounts sum correctly
- [ ] Overdue calculation works (items > 3 days old)
- [ ] This week calculation uses correct date range
- [ ] Empty database returns zeros, not nulls

---

## Phase 3: Action Queue API

### Files to Create
```
src/app/api/dashboard/queue/route.ts
```

### API Design

**Endpoint:** `GET /api/dashboard/queue`

**Query Params:**
- `filter`: 'all' | 'urgent' | 'review' | 'ready_to_pay'
- `sort`: 'oldest' | 'newest' | 'amount_high' | 'amount_low'

**Response:**
```typescript
{
  urgent: ActionItem[];      // Overdue items (> 3 days)
  needsReview: ActionItem[]; // Recent submissions
  readyToPay: ActionItem[];  // Approved, awaiting payment
}

interface ActionItem {
  id: string;
  type: 'payment_application' | 'change_order';
  referenceNumber: string;  // PA-0047 or CO-0018
  contractorName: string;
  projectName: string;
  projectId: string;
  amount: number;
  status: string;
  description: string;
  submittedAt: string;
  daysOld: number;
}
```

### Query Logic

```sql
-- Combine payment applications and change orders into unified queue
-- Payment Applications
SELECT 
  pa.id,
  'payment_application' as type,
  CONCAT('PA-', LPAD(pa.id::text, 4, '0')) as reference_number,
  c.name as contractor_name,
  p.name as project_name,
  p.id as project_id,
  pa.amount,
  pa.status,
  pa.description,
  pa.created_at as submitted_at,
  EXTRACT(DAY FROM NOW() - pa.created_at) as days_old
FROM payment_applications pa
JOIN contractors c ON c.id = pa.contractor_id
JOIN projects p ON p.id = pa.project_id
WHERE pa.status NOT IN ('paid', 'rejected', 'cancelled')

UNION ALL

-- Change Orders needing approval
SELECT
  co.id,
  'change_order' as type,
  CONCAT('CO-', LPAD(co.id::text, 4, '0')) as reference_number,
  c.name as contractor_name,
  p.name as project_name,
  p.id as project_id,
  co.cost_impact as amount,
  co.status,
  co.description,
  co.created_at as submitted_at,
  EXTRACT(DAY FROM NOW() - co.created_at) as days_old
FROM change_orders co
JOIN contractors c ON c.id = co.contractor_id
JOIN projects p ON p.id = co.project_id
WHERE co.status = 'pending'

ORDER BY days_old DESC, amount DESC;
```

### Testing Checklist
- [ ] Urgent items are those > 3 days old
- [ ] Items sorted by age then amount
- [ ] Both payment apps and change orders appear
- [ ] Reference numbers format correctly
- [ ] Empty queue returns empty arrays

---

## Phase 4: Build Dashboard Components

### StatCard Component

`src/app/components/dashboard/StatCard.tsx`:

```typescript
interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  variant?: 'default' | 'warning' | 'danger' | 'success';
  onClick?: () => void;
}
```

Visual:
- Danger (red) for items needing immediate attention
- Warning (yellow/orange) for pending items
- Success (green) for completed metrics
- Clickable to filter the queue below

### ActionItem Component

`src/app/components/dashboard/ActionItem.tsx`:

```typescript
interface ActionItemProps {
  item: ActionItem;
  onReview: () => void;
  onQuickApprove?: () => void;
  onMarkPaid?: () => void;
}
```

Features:
- Shows type icon (dollar sign for PA, document for CO)
- Color-coded left border by urgency
- Inline quick actions (Review, Approve checkmark)
- Click anywhere to open full detail modal

### ActionQueue Component

Groups items by urgency level:
- 🔴 URGENT - red header, items > 3 days old
- 🟡 NEEDS REVIEW - yellow header, recent submissions  
- ✅ READY TO PAY - green header, approved awaiting payment

Collapsible sections with count badges.

### Testing Checklist
- [ ] StatCards display correct values
- [ ] Clicking StatCard filters queue
- [ ] ActionItems show all required info
- [ ] Quick approve works without opening modal
- [ ] Color coding matches urgency
- [ ] Sections collapse/expand
- [ ] Empty sections show "All caught up!" message

---

## Phase 5: Quick Actions

### Implementation

**Quick Approve (Checkmark Button)**

For payment applications where:
- PM has already verified percentages
- Amount matches expected
- No disputes

One-click approval:
1. PATCH /api/payment-applications/[id] with status: 'approved'
2. Optimistically update UI
3. Show toast: "PA-0047 approved - $8,500"
4. Remove from needs-review, add to ready-to-pay

**Mark Paid Button**

For approved items:
1. Opens minimal modal: "Confirm payment of $X to [Contractor]?"
2. Optional: Check number input
3. PATCH with status: 'paid', paid_date: today
4. Remove from queue entirely

### Files to Modify
```
src/app/api/payment-applications/[id]/route.ts (add quick status update)
src/app/components/dashboard/ActionItem.tsx
```

### Testing Checklist
- [ ] Quick approve updates status without page reload
- [ ] Toast notification appears
- [ ] Item moves to correct section
- [ ] Mark paid removes from queue
- [ ] Undo available for 5 seconds after quick actions

---

## Phase 6: Recent Activity Feed

### Files to Create
```
src/app/api/dashboard/activity/route.ts
src/app/components/dashboard/RecentActivity.tsx
```

### API Design

**Endpoint:** `GET /api/dashboard/activity?limit=10`

Query recent status changes across all entities:
- Payment application status changes
- Change order approvals
- New submissions

```sql
-- Use a union of recent events
SELECT 
  'payment_approved' as event_type,
  pa.id as entity_id,
  CONCAT('PA-', LPAD(pa.id::text, 4, '0'), ' approved') as description,
  pa.amount,
  pa.updated_at as event_time
FROM payment_applications pa
WHERE pa.status = 'approved'
AND pa.updated_at > NOW() - INTERVAL '7 days'

UNION ALL

SELECT
  'payment_submitted' as event_type,
  pa.id,
  CONCAT('New payment request from ', c.name) as description,
  pa.amount,
  pa.created_at
FROM payment_applications pa
JOIN contractors c ON c.id = pa.contractor_id
WHERE pa.created_at > NOW() - INTERVAL '7 days'

ORDER BY event_time DESC
LIMIT 10;
```

### Display

Simple list with:
- Bullet point icon (colored by type)
- Description text
- Relative time ("2 hours ago", "yesterday")

"View All" link goes to full activity log (future feature).

### Testing Checklist
- [ ] Shows last 10 events
- [ ] Times display in relative format
- [ ] Events from all types appear
- [ ] Empty state: "No recent activity"

---

## Completion Criteria

- [ ] Dashboard is the default landing page
- [ ] All four stat cards show accurate data
- [ ] Action queue loads with correct groupings
- [ ] Quick approve works for payment applications
- [ ] Mark paid removes items from queue
- [ ] Recent activity shows last 10 events
- [ ] Mobile responsive (stack cards vertically)
- [ ] Loading skeletons for async data
- [ ] Refresh button updates all data
- [ ] No console errors
