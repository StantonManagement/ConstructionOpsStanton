# Cash Position Implementation Specification

> **Last Updated:** January 29, 2026
> **Status:** Ready for Implementation
> **Priority:** High

---

## Table of Contents

1. [Overview](#overview)
2. [The Problem We're Solving](#the-problem-were-solving)
3. [Data Model](#data-model)
4. [Business Logic](#business-logic)
5. [API Endpoints](#api-endpoints)
6. [UI Components](#ui-components)
7. [Page Layouts](#page-layouts)
8. [Implementation Phases](#implementation-phases)
9. [Edge Cases](#edge-cases)
10. [Integration Points](#integration-points)

---

## Overview

### Core Question
**"Do I have the money to pay what I need to pay?"**

### What This Page Does
- Shows available funds across all funding sources
- Tracks committed vs available amounts
- Warns when funds are insufficient
- Helps decide which contractors get paid today

### Key Metric
```
TRUE AVAILABLE = Available to Draw - Committed
```

Where:
- **Available to Draw** = Commitment - Drawn
- **Committed** = Approved but unpaid payment applications

---

## The Problem We're Solving

### The Complexity

#### Multiple Layers
```
Owner Entity (Stanton Capital)
    ├── Direct Funding (owner-funded projects)
    │
    └── Portfolio (SREP NORTHEND)
            ├── Funding Source A (Arbor loan: $2M committed, $800K drawn)
            ├── Funding Source B (State grant: $150K)
            │
            ├── Project 1 → pulls from A
            ├── Project 2 → pulls from A + B (split funding)
            └── Project 3 → funded by Owner Entity directly
```

#### Daily Reality
Alex (payments coordinator) needs to decide:
1. Which contractors get paid today
2. Whether to wait for next loan draw
3. If we can approve pending payment applications

This requires knowing:
- What's available across ALL funding sources
- What's already committed (approved but unpaid)
- What's coming due

---

## Data Model

### Existing Tables

#### funding_sources
```sql
CREATE TABLE funding_sources (
  id UUID PRIMARY KEY,
  portfolio_id UUID REFERENCES portfolios(id),
  name TEXT NOT NULL,
  type TEXT, -- 'loan' | 'grant' | 'equity' | 'other'
  commitment_amount DECIMAL(12,2),
  drawn_amount DECIMAL(12,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### loan_draws
```sql
CREATE TABLE loan_draws (
  id UUID PRIMARY KEY,
  funding_source_id UUID REFERENCES funding_sources(id),
  project_id UUID REFERENCES projects(id),
  amount DECIMAL(12,2),
  draw_date DATE,
  status TEXT, -- 'pending' | 'approved' | 'funded' | 'rejected'
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### payment_applications
```sql
-- May need to add funding_source_id if missing
ALTER TABLE payment_applications
ADD COLUMN funding_source_id UUID REFERENCES funding_sources(id);
```

### New Table Needed: project_funding_sources

**Purpose:** Handle projects that pull from multiple funding sources

```sql
CREATE TABLE project_funding_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  funding_source_id UUID REFERENCES funding_sources(id) ON DELETE CASCADE,
  allocated_amount DECIMAL(12,2) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(project_id, funding_source_id)
);

-- Indexes
CREATE INDEX idx_project_funding_sources_project ON project_funding_sources(project_id);
CREATE INDEX idx_project_funding_sources_funding ON project_funding_sources(funding_source_id);
```

---

## Business Logic

### Key Calculations

#### 1. Available to Draw
```typescript
availableToDraw = fundingSource.commitment_amount - fundingSource.drawn_amount
```

#### 2. Committed Amount
```typescript
committed = SUM(
  payment_applications
  WHERE funding_source_id = fundingSource.id
    AND status = 'approved'
    AND paid_date IS NULL
)
```

#### 3. True Available (THE KEY NUMBER)
```typescript
trueAvailable = availableToDraw - committed
```

#### 4. Project Can Be Funded?
```typescript
projectRemainingBudget = project.budget - project.spent - projectCommitted

sourcesAvailable = SUM(
  funding_sources.true_available
  WHERE funding_source_id IN project.funding_source_ids
)

canBeFunded = sourcesAvailable >= projectRemainingBudget
```

### Warning Thresholds

| Condition | Status | Action |
|-----------|--------|--------|
| `trueAvailable >= remainingBudget` | ✅ OK | Green indicator |
| `trueAvailable < remainingBudget` | ⚠️ Warning | Yellow - may need to pause work |
| `trueAvailable < committed` | 🚨 Critical | Red - can't pay approved invoices |
| `No funding source assigned` | ⚪ Unassigned | Gray - needs allocation |

---

## API Endpoints

### 1. Portfolio Cash Position
```typescript
GET /api/portfolios/[id]/cash-position

Response: {
  portfolio: Portfolio;
  funding_sources: Array<{
    id: string;
    name: string;
    type: 'loan' | 'grant' | 'equity' | 'other';
    commitment_amount: number;
    drawn_amount: number;
    available_to_draw: number;      // calculated
    committed: number;               // calculated
    true_available: number;          // calculated
    projects_using: Array<{
      project_id: string;
      project_name: string;
      allocated_amount: number;
    }>;
    status: 'ok' | 'warning' | 'critical';
  }>;
  summary: {
    total_commitment: number;
    total_drawn: number;
    total_available: number;
    total_committed: number;
    total_true_available: number;
  };
}
```

### 2. Project Cash Position
```typescript
GET /api/projects/[id]/cash-position

Response: {
  project: Project;
  budget: number;
  spent: number;
  committed: number;
  remaining_budget: number;        // calculated
  funding_sources: Array<{
    id: string;
    name: string;
    allocated_amount: number;
    available_from_source: number;
    is_primary: boolean;
  }>;
  total_available_from_sources: number;
  can_be_funded: boolean;          // calculated
  status: 'ok' | 'warning' | 'critical' | 'unassigned';
}
```

### 3. All Cash Position (Cross-Portfolio)
```typescript
GET /api/owner-entities/[id]/cash-summary

Response: {
  portfolios: Array<{
    portfolio_id: string;
    portfolio_name: string;
    total_commitment: number;
    total_drawn: number;
    total_available: number;
    active_project_count: number;
    burn_rate_weekly: number;       // calculated
  }>;
  totals: {
    commitment: number;
    drawn: number;
    available: number;
    projects: number;
  };
}
```

### 4. Funding Source Projects
```typescript
GET /api/funding-sources/[id]/projects

Response: {
  funding_source: FundingSource;
  projects: Array<{
    project_id: string;
    project_name: string;
    allocated_amount: number;
    spent_from_source: number;
    remaining_from_allocation: number;
    is_primary: boolean;
  }>;
  total_allocated: number;
  available_after_allocations: number;
}
```

---

## UI Components

### 1. CashPositionCard

**Purpose:** Reusable card showing funding source availability

**Props:**
```typescript
interface CashPositionCardProps {
  fundingSource: {
    id: string;
    name: string;
    type: string;
    commitment_amount: number;
    drawn_amount: number;
    available_to_draw: number;
    committed: number;
    true_available: number;
    status: 'ok' | 'warning' | 'critical';
  };
  projects?: Array<{
    id: string;
    name: string;
    allocated_amount: number;
  }>;
  onRequestDraw?: () => void;
  onViewHistory?: () => void;
}
```

**Visual:**
```
┌─────────────────────────────────────────────────┐
│ Arbor Construction Loan           SREP NORTHEND │
│ ───────────────────────────────────────────────  │
│ Commitment      $2,000,000                      │
│ Drawn             $800,000                      │
│ ───────────────────────────────────────────────  │
│ Available        $1,200,000                     │
│ Committed          $150,000  (approved, unpaid) │
│ ───────────────────────────────────────────────  │
│ TRUE AVAILABLE   $1,050,000              ✅ OK  │
│                                                 │
│ Projects using this source:                     │
│   • 31 Park Renovation ($400K allocated)        │
│   • 45 Main St ($350K allocated)                │
│                                                 │
│ [Request Draw]  [View History]                  │
└─────────────────────────────────────────────────┘
```

### 2. ProjectFundingStatus

**Purpose:** Shows project's funding health

**Props:**
```typescript
interface ProjectFundingStatusProps {
  project: {
    id: string;
    name: string;
    budget: number;
    spent: number;
    committed: number;
  };
  funding_sources: Array<{
    id: string;
    name: string;
    allocated_amount: number;
    available: number;
  }>;
  can_be_funded: boolean;
}
```

**Visual:**
```
┌─────────────────────────────────────────────────┐
│ 💵 Funding Status                               │
│ ───────────────────────────────────────────────  │
│ Budget:         $450,000                        │
│ Spent:          $180,000                        │
│ Committed:       $45,000                        │
│ Remaining:      $225,000                        │
│ ───────────────────────────────────────────────  │
│ Funding Sources:                                │
│   Arbor Loan    $400,000 allocated              │
│   State Grant    $50,000 allocated              │
│ ───────────────────────────────────────────────  │
│ Available from sources: $1,050,000        ✅ OK │
│ (Sufficient to complete)                        │
│                                                 │
│ [View Details]                                  │
└─────────────────────────────────────────────────┘
```

### 3. AvailabilityBadge

**Purpose:** Visual status indicator

```typescript
interface AvailabilityBadgeProps {
  status: 'ok' | 'warning' | 'critical' | 'unassigned';
  amount?: number;
}
```

**Visual:**
```typescript
// OK
<div className="flex items-center gap-1 text-green-600 dark:text-green-400">
  <CheckCircle2 className="w-4 h-4" />
  <span className="text-xs font-medium">OK</span>
</div>

// Warning
<div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
  <AlertTriangle className="w-4 h-4" />
  <span className="text-xs font-medium">Low</span>
</div>

// Critical
<div className="flex items-center gap-1 text-red-600 dark:text-red-400">
  <AlertCircle className="w-4 h-4" />
  <span className="text-xs font-medium">Critical</span>
</div>
```

### 4. SummaryCards

**Purpose:** Top-level metrics

```typescript
interface SummaryCardsProps {
  total_commitment: number;
  total_drawn: number;
  total_available: number;
}
```

**Visual:**
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Total        │ │ Total Drawn  │ │ Available    │
│ Commitment   │ │              │ │              │
│ $4,500,000   │ │ $1,800,000   │ │ $2,700,000   │
└──────────────┘ └──────────────┘ └──────────────┘
```

---

## Page Layouts

### Main Cash Position Page

**Route:** `/cash-position`
**File:** `src/app/(dashboard)/cash-position/page.tsx`

```tsx
export default function CashPositionPage() {
  return (
    <AppLayout>
      <PageContainer>
        {/* Header */}
        <div className="mb-3">
          <h1 className="text-xl font-bold text-foreground">Cash Position</h1>
          <p className="text-xs text-muted-foreground">
            Available funds across all portfolios
          </p>
        </div>

        {/* Portfolio Filter */}
        <div className="mb-3">
          <select className="...">
            <option value="all">All Portfolios</option>
            {/* Portfolio options */}
          </select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <SummaryCard title="Total Commitment" value="$4,500,000" />
          <SummaryCard title="Total Drawn" value="$1,800,000" />
          <SummaryCard title="Available" value="$2,700,000" />
        </div>

        {/* Funding Source Cards */}
        <div className="space-y-3">
          {fundingSources.map(source => (
            <CashPositionCard key={source.id} fundingSource={source} />
          ))}
        </div>
      </PageContainer>
    </AppLayout>
  );
}
```

### Integration: Project Detail Page

**Add to:** `src/app/projects/page.tsx` (when project selected)

Add as a card or tab:

```tsx
// As a card in overview
<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
  <BudgetCard project={project} />
  <ProjectFundingStatus project={project} /> {/* NEW */}
  <ContractorsCard project={project} />
  <LocationsCard project={project} />
</div>
```

### Integration: Dashboard Widget

**Add to:** `src/app/dashboard/page.tsx` or `ImprovedOverviewView.tsx`

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
  {/* Existing metric cards */}

  {/* NEW: Cash Position Summary */}
  <MetricCard
    title="Available Funds"
    value={formatCurrency(totalAvailable)}
    subtitle={`${fundingSources.length} sources`}
    icon={<DollarSign className="w-4 h-4 text-primary" />}
    onClick={() => router.push('/cash-position')}
  />
</div>
```

---

## Implementation Phases

### Phase 1: Portfolio Cash Position (Week 1)

**Goal:** Display funding sources with availability

**Tasks:**
1. ✅ Create `project_funding_sources` table
2. ✅ Create API endpoint: `GET /api/portfolios/[id]/cash-position`
3. ✅ Build `CashPositionCard` component
4. ✅ Build `SummaryCards` component
5. ✅ Build `/cash-position` page
6. ✅ Add to sidebar navigation

**Deliverable:** Users can see all funding sources and their true available amounts

---

### Phase 2: Project Cash Position (Week 2)

**Goal:** Show funding status on project detail page

**Tasks:**
1. ✅ Create API endpoint: `GET /api/projects/[id]/cash-position`
2. ✅ Build `ProjectFundingStatus` component
3. ✅ Add to project detail page (as card or tab)
4. ✅ Implement warning states

**Deliverable:** Users can see if a project has sufficient funding to complete

---

### Phase 3: Cross-Portfolio Summary (Week 3)

**Goal:** Owner-level view across all portfolios

**Tasks:**
1. ✅ Create API endpoint: `GET /api/owner-entities/[id]/cash-summary`
2. ✅ Add "All Portfolios" view to cash position page
3. ✅ Calculate burn rate per portfolio
4. ✅ Show total rollup

**Deliverable:** Dan/Zach can see big picture across all portfolios

---

### Phase 4: Payment Integration (Week 4)

**Goal:** Check availability before approving payments

**Tasks:**
1. ✅ Add availability check to payment approval flow
2. ✅ Block or warn if insufficient funds
3. ✅ Show which funding source will be used
4. ✅ Update committed amounts when payment approved

**Deliverable:** System prevents approving payments when funds unavailable

---

## Edge Cases

### 1. Project with NO Funding Source
**Scenario:** Owner-funded or not yet allocated

**Handling:**
- Show "Funding: Owner Direct" or "Funding: Not Assigned"
- Status badge: Gray "Unassigned"
- Don't include in funding source calculations
- Allow admins to assign funding source later

---

### 2. Project with MULTIPLE Funding Sources
**Scenario:** $400K from Arbor, $50K from State Grant

**Handling:**
- Use `project_funding_sources` junction table
- Show all sources on project funding status
- Sum available from all sources
- Payment apps specify which source they draw from

---

### 3. Funding Source Shared Across Projects
**Scenario:** 3 projects pulling from same $2M loan

**Handling:**
- Show "Projects using this source" list on funding card
- Alert if sum of remaining budgets > source availability
- Example: "$1.8M allocated across 3 projects, $1.2M available"

---

### 4. Cross-Portfolio Project
**Scenario:** Project belongs to Owner Entity, not a portfolio

**Handling:**
- May draw from multiple portfolio funding sources
- Requires explicit allocation in `project_funding_sources`
- Show all sources on project detail

---

### 5. Retention Held
**Scenario:** 10% retention held on completed work

**Handling:**
- Track in separate field: `retention_held`
- Don't count retention as "available to draw"
- Show: "Eligible for draw: $X" vs "Held in retention: $Y"
- Release retention on project completion milestone

---

### 6. Draw Request In Progress
**Scenario:** $500K draw submitted but not yet funded

**Handling:**
- Don't count as available until status = 'funded'
- Show "Pending Draw: $500K" on funding card
- Gray out or dim the pending amount

---

## Integration Points

### 1. Payment Applications
**Connection:** Determines if payment can be funded

```typescript
// Before approving payment
const cashPosition = await getProjectCashPosition(projectId);
if (cashPosition.true_available < paymentAmount) {
  // Show warning or block approval
  throw new Error('Insufficient funds available');
}
```

### 2. Loan Draws
**Connection:** Updates drawn_amount on funding source

```typescript
// When draw is funded
await updateFundingSource(fundingSourceId, {
  drawn_amount: current_drawn + draw_amount
});

// Recalculate cash position
await recalculateCashPosition(fundingSourceId);
```

### 3. Project Detail
**Connection:** Shows funding status card

```typescript
// On project detail page
<ProjectFundingStatus
  project={project}
  fundingSources={project.funding_sources}
  canBeFunded={cashPosition.can_be_funded}
/>
```

### 4. Dashboard
**Connection:** Surface alerts for low availability

```typescript
// Dashboard widget
const criticalSources = fundingSources.filter(
  s => s.status === 'critical'
);

if (criticalSources.length > 0) {
  // Show alert: "⚠️ 2 funding sources critical"
}
```

---

## File Structure

```
src/
├── app/(dashboard)/
│   ├── cash-position/
│   │   └── page.tsx                    ← Main cash position page
│   │
│   ├── projects/
│   │   └── page.tsx                    ← Add ProjectFundingStatus here
│   │
│   └── dashboard/
│       └── page.tsx                    ← Add cash position widget
│
├── components/
│   ├── cash-position/
│   │   ├── CashPositionCard.tsx        ← Funding source card
│   │   ├── ProjectFundingStatus.tsx    ← Project funding card
│   │   ├── AvailabilityBadge.tsx       ← Status indicator
│   │   └── SummaryCards.tsx            ← Top metrics
│   │
│   └── ui/                             ← Existing UI components
│
├── hooks/queries/
│   └── useCashPosition.ts              ← React Query hooks
│
└── lib/
    └── cash-position.ts                ← Business logic helpers
```

---

## Testing Checklist

### Unit Tests
- [ ] Calculate available_to_draw correctly
- [ ] Calculate committed correctly
- [ ] Calculate true_available correctly
- [ ] Warning threshold logic
- [ ] Multi-source project handling

### Integration Tests
- [ ] Fetch portfolio cash position
- [ ] Fetch project cash position
- [ ] Update when draw is funded
- [ ] Update when payment approved
- [ ] Update when payment paid

### UI Tests
- [ ] CashPositionCard renders correctly
- [ ] Warning badges show proper colors
- [ ] Portfolio filter works
- [ ] Project funding status accurate
- [ ] Dashboard widget links to page

---

## Open Questions

1. **Multi-source payment apps** — Can a single payment draw from multiple funding sources?
   - **Decision needed:** One source per payment OR split payment

2. **Retention tracking** — Funding source level or project level?
   - **Decision needed:** Add `retention_held` field where?

3. **Draw request workflow** — In scope or separate feature?
   - **Decision needed:** Full workflow or just "Request Draw" button placeholder

4. **Historical tracking** — Show cash position over time?
   - **Decision needed:** Current state only OR timeline view

5. **Permissions** — Who can see cash position?
   - **Decision needed:** Admins only OR PMs too

---

## Success Criteria

### Must Have (Phase 1-2)
- ✅ View all funding sources with true available amounts
- ✅ See which projects use each source
- ✅ Warning when funds are low
- ✅ Project detail shows funding status

### Should Have (Phase 3-4)
- ✅ Cross-portfolio summary view
- ✅ Payment approval checks availability
- ✅ Dashboard widget with alerts

### Nice to Have (Future)
- Historical cash position tracking
- Cash flow forecasting integration
- Draw request workflow
- Automated alerts/notifications

---

## Next Steps

1. **Review this spec** with Dan/Zach for open questions
2. **Create migration** for `project_funding_sources` table
3. **Build Phase 1** - Portfolio cash position view
4. **Test with real data** before moving to Phase 2

---

**End of Specification**
