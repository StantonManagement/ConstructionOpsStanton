# Construction Ops UI Improvements - Cursor Implementation Plan

## Context
Small renovation shop (6-10 units at a time). Workflow is **contractor-payment-centric**: "which contractor needs to get paid for which projects today." Not project-centric like large GCs. Daily users are owner doing accounting and PM handling payment approvals.

---

## Pre-Work: Audit Current State

Before implementing, verify what actually exists in the running app:

**Questions for developer to answer:**
1. Is `ManageView.tsx` actually rendered in navigation? (wireframes say yes, user says no)
2. Are `ComplianceView.tsx` and `MetricsView.tsx` live or placeholders?
3. How many nav items actually appear for admin role right now?

**Expected nav (based on user screenshot):**
```
Overview
Projects
Field Ops
Payments
Contractors
Change Orders
Budget Dashboard
Settings
Daily Logs
```

If Compliance, Metrics, or Manage appear - they should be removed or hidden unless actively used.

---

## Priority 1: Project Context Selector in Header

**File:** `src/app/components/Header.tsx`

**What to build:**
Add a project selector dropdown to the header that persists across all views and filters relevant data.

**Implementation:**

1. Add project selector after logo/branding, before search:
```tsx
// Approximate placement
<div className="flex items-center gap-4">
  <Logo />
  <ProjectSelector 
    selectedProject={selectedProject}
    onSelect={handleProjectSelect}
    projects={projects}
  />
  <SearchBar />
</div>
```

2. ProjectSelector component:
   - Dropdown showing "All Projects" + list of active projects
   - Shows project name + colored status dot
   - ~200px width, compact style
   - Stores selection in URL param `?project=ID`

3. **Which views get filtered when a project is selected:**
   - **Payments**: Show only payment apps for selected project
   - **Change Orders**: Show only COs for selected project
   - **Budget Dashboard**: Scope to selected project's budget
   - **Daily Logs**: Show only requests for selected project
   - **Overview**: Highlight selected project in tiles
   - **Contractors**: Show contractors assigned to selected project (optional - could also show all)

4. **Persistence:**
   - URL param `?project=ID` is source of truth
   - Selecting project adds/updates param
   - "All Projects" removes param
   - Param survives tab navigation

**Acceptance:**
- [ ] Dropdown visible in header on desktop and tablet
- [ ] Selecting project updates URL and filters Payments/COs/Budget/Daily Logs
- [ ] "All Projects" clears filter, shows everything
- [ ] Current project name visible in header at all times when selected
- [ ] Selection persists across tab navigation

---

## Priority 2: Contractor-Centric Payment View Option

**File:** `src/app/components/PaymentsView.tsx`

**Problem:** Current view is status-centric (SMS pending, review queue, ready checks). But daily workflow is "the plumber needs to get paid for these two jobs."

**What to build:**
Add a "Group by Contractor" toggle to the Payments view.

**Implementation:**

1. Add toggle in filter bar:
```tsx
<div className="flex gap-2">
  <Button 
    variant={groupBy === 'status' ? 'default' : 'outline'}
    onClick={() => setGroupBy('status')}
  >
    By Status
  </Button>
  <Button 
    variant={groupBy === 'contractor' ? 'default' : 'outline'}
    onClick={() => setGroupBy('contractor')}
  >
    By Contractor
  </Button>
</div>
```

2. When "By Contractor" is active:
   - Group payment apps by contractor name
   - Each contractor section shows:
     - Contractor name + total pending amount
     - List of their payment apps across projects
     - "Pay All" button to process all at once
   - Example display:
   ```
   Metro Plumbing — $8,500 pending
   ├─ 31 Park: $4,200 (Ready for check)
   ├─ 10 Wolcott: $3,100 (Awaiting approval)  
   └─ 15 Oak: $1,200 (SMS pending)
   [Pay Ready Items]
   ```

3. Keep existing status view as default for users who prefer it

**Acceptance:**
- [ ] Toggle exists in Payments view
- [ ] "By Contractor" groups apps under contractor headers
- [ ] Each contractor group shows total and per-project breakdown
- [ ] Can still filter by status within contractor view
- [ ] Default is "By Status" (existing behavior)

---

## Priority 3: Promote Daily Logs in Navigation

**File:** `src/app/components/Navigation.tsx`

**Current state:** Daily Logs is last item, treated as afterthought.

**Changes:**

1. Move "Daily Logs" up in nav order - place after Field Ops:
```
Overview
Projects  
Field Ops
Daily Logs  ← moved up
Payments
Contractors
Change Orders
Budget Dashboard
Settings
```

2. Add notification badge showing count of:
   - Logs awaiting response today
   - OR logs with new notes received

3. Badge styling:
```tsx
{pendingCount > 0 && (
  <span className="ml-auto bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
    {pendingCount}
  </span>
)}
```

**Acceptance:**
- [ ] Daily Logs appears after Field Ops in nav
- [ ] Badge shows count of pending/today's requests
- [ ] Badge updates when data refreshes

---

## Priority 4: Standardize Empty States

**Create component:** `src/app/components/ui/EmptyState.tsx`

```tsx
interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  )
}
```

**Apply to these views:**

| View | Icon | Title | Description | Action |
|------|------|-------|-------------|--------|
| PaymentsView | `Receipt` | "No payment applications" | "Payment requests from contractors will appear here. Start by adding contractors to a project." | "Go to Projects" |
| ContractorsView | `Users` | "No contractors added" | "Add your subcontractors to start tracking payments and contracts." | "Add Contractor" |
| ChangeOrdersView | `FileEdit` | "No change orders" | "Change orders will appear here when scope changes are submitted." | "Create Change Order" |
| DailyLogsView | `MessageSquare` | "No daily log requests" | "Set up automated SMS requests to get daily updates from your PM." | "Add Request" |
| ProjectsView | `FolderOpen` | "No projects yet" | "Create your first project to start tracking budgets and payments." | "New Project" |
| PhotoGalleryView | `Image` | "No photos uploaded" | "Photos from job sites will appear here." | "Upload Photos" |
| PunchListView | `ClipboardList` | "No punch list items" | "Punch list items will appear here as projects near completion." | "Add Item" |

**Acceptance:**
- [ ] EmptyState component created and exported
- [ ] All listed views use EmptyState when data array is empty
- [ ] Actions navigate to correct flow or open correct modal
- [ ] Consistent styling across all empty states

---

## Priority 5: Cash Flow Placeholder in Budget Dashboard

**File:** `src/app/components/BudgetDashboard.tsx`

**Where:** Add as a card after the status summary cards, before the chart.

**Implementation:**
```tsx
<Card className="border-dashed border-2 border-muted bg-muted/20">
  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
    <TrendingUp className="h-10 w-10 text-muted-foreground mb-3" />
    <h3 className="font-semibold text-lg mb-1">Cash Flow Projection</h3>
    <p className="text-sm text-muted-foreground mb-2">Coming Soon</p>
    <p className="text-xs text-muted-foreground max-w-xs">
      Track when payments are due out and when draws are expected in. 
      Project your cash position 30/60/90 days out.
    </p>
  </CardContent>
</Card>
```

**Acceptance:**
- [ ] Placeholder card visible in Budget Dashboard
- [ ] Dashed border + muted background signals "future feature"
- [ ] Does not break existing layout
- [ ] Responsive on mobile

---

## Priority 6: Fix Modal Stacking

**Problem:** Opening a modal, then opening another modal from within it, creates confusing UX.

**Audit these files:**
- `src/app/components/ContractorsView.tsx`
- `src/app/components/ContractorDetailView.tsx`
- `src/app/components/ProjectDetailView.tsx`
- `src/app/components/PaymentsView.tsx`
- `src/app/components/PMDashboard.tsx`

**Pattern to identify:**
```tsx
// BAD: Stacking
<Modal open={showContractor}>
  <ContractorDetail>
    <Button onClick={() => setShowPayment(true)}>View Payment</Button>
  </ContractorDetail>
</Modal>
<Modal open={showPayment}>  {/* Second modal on top of first */}
  <PaymentDetail />
</Modal>
```

**Fix options:**

**Option A - Replace content:**
```tsx
const [modalContent, setModalContent] = useState<'contractor' | 'payment' | null>(null)

<Modal open={modalContent !== null}>
  {modalContent === 'contractor' && <ContractorDetail onViewPayment={() => setModalContent('payment')} />}
  {modalContent === 'payment' && <PaymentDetail onBack={() => setModalContent('contractor')} />}
</Modal>
```

**Option B - Navigate instead:**
```tsx
// Instead of opening nested modal, navigate to the page
<Button onClick={() => router.push(`/payments/${id}`)}>View Payment</Button>
```

**Option C - Use tabs within modal:**
```tsx
<Modal>
  <Tabs>
    <Tab label="Overview">...</Tab>
    <Tab label="Payments">...</Tab>
    <Tab label="Contracts">...</Tab>
  </Tabs>
</Modal>
```

**Specific fixes:**

1. **PMDashboard ProjectOverview**: Has nested modals for contracts, payments, daily logs
   - Fix: Convert to tabs within the project modal

2. **ContractorDetailView**: If "view payment" opens another modal
   - Fix: Navigate to Payments tab with contractor filter, OR use tabs

3. **ProjectDetailView**: Multiple data modals inside
   - Fix: Already has subtabs, use those instead of modals

**Acceptance:**
- [ ] No view ever has 2+ modals open simultaneously
- [ ] Back/close behavior is predictable (one action returns to main view)
- [ ] User never needs to click "X" multiple times to get back

---

## Priority 7: Remove Unused Navigation Items

**File:** `src/app/components/Navigation.tsx`

**Verify and remove if not actively used:**
- `ManageView` - user says they don't see it, but wireframes document it. If code exists but nav item is hidden, delete the code.
- `ComplianceView` - is this used? If not, remove from nav.
- `MetricsView` - is this used? If not, remove from nav.

**Target nav for admin role:**
```
Overview
Projects
Field Ops
Daily Logs
Payments
Contractors
Change Orders
Budget Dashboard
Settings
```

That's 9 items. No more.

**Acceptance:**
- [ ] ManageView removed from nav (and optionally code deleted)
- [ ] Only actively-used tabs appear in navigation
- [ ] PM role sees appropriate subset

---

## Implementation Order

1. **EmptyState component** (unblocks multiple views, quick win)
2. **Project selector in header** (highest visibility improvement)
3. **Navigation reorder + Daily Logs badge**
4. **Apply EmptyState to all views**
5. **Budget Dashboard placeholder**
6. **Contractor-centric payment grouping**
7. **Modal stacking audit and fixes** (may take longer)
8. **Remove unused nav items**

Each step is independently deployable. Test after each.

---

## Files to Modify Summary

| File | Changes |
|------|---------|
| `Header.tsx` | Add project selector dropdown |
| `Navigation.tsx` | Reorder items, add Daily Logs badge, remove unused items |
| `ui/EmptyState.tsx` | NEW - create component |
| `PaymentsView.tsx` | Add empty state, add "By Contractor" grouping toggle |
| `ContractorsView.tsx` | Add empty state, check modal patterns |
| `ChangeOrdersView.tsx` | Add empty state |
| `DailyLogsView.tsx` | Add empty state |
| `ProjectsView.tsx` | Add empty state |
| `PhotoGalleryView.tsx` | Add empty state |
| `PunchListView.tsx` | Add empty state |
| `BudgetDashboard.tsx` | Add cash flow placeholder card |
| `ContractorDetailView.tsx` | Fix modal stacking if present |
| `PMDashboard.tsx` | Fix modal stacking (convert to tabs) |
| `ProjectDetailView.tsx` | Fix modal stacking if present |

---

## Testing Checklist

After all changes:

- [ ] Header project selector works and persists across tabs
- [ ] Project selector filters Payments, COs, Budget, Daily Logs correctly
- [ ] "All Projects" clears all filters
- [ ] Daily Logs is higher in nav with badge
- [ ] All empty states display helpful messages
- [ ] Empty state actions work (navigate or open modal)
- [ ] Budget Dashboard shows cash flow placeholder
- [ ] Payments view has "By Contractor" grouping option
- [ ] No modal stacking anywhere
- [ ] Navigation has 9 items for admin (no Manage, Compliance, Metrics unless used)
- [ ] No console errors
- [ ] Mobile responsive still works
