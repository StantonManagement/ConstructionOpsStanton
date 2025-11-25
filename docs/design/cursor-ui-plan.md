# Construction Ops UI Improvements - Cursor Implementation Plan

## Context
Small renovation shop (6-10 units at a time). Workflow is contractor-payment-centric: "which contractor needs to get paid for which projects today." Not project-centric like large GCs. Daily users are owner doing accounting and PM handling payment approvals.

---

## Priority 1: Project Context Selector in Header

**File:** `src/app/components/Header.tsx`

**What to build:**
Add a project selector dropdown to the header that persists across all views. When user is working on "31 Park," it should show in the header.

**Implementation:**
1. Add state for `selectedProject` (can lift from URL param `?project=` or create new context)
2. Add dropdown component after the logo/title area, before search
3. Dropdown shows: "All Projects" option + list of active projects
4. Selecting a project:
   - Updates URL param `?project=ID`
   - Filters relevant data in Payments, Change Orders, Budget views
   - Shows project name in header with colored dot indicator
5. Style: compact dropdown, ~200px width, shows project name + status badge

**Acceptance:**
- [ ] Dropdown visible in header on all screen sizes
- [ ] Selecting project persists across tab navigation
- [ ] "All Projects" clears the filter
- [ ] Current project highlighted in dropdown

---

## Priority 2: Promote Daily Logs in Navigation

**File:** `src/app/components/Navigation.tsx`

**Current state:** Daily Logs is last item in nav, treated as afterthought.

**Changes:**
1. Move "Daily Logs" up in nav order - place it after "Field Ops" (field crew cares about this daily)
2. Rename to "Daily Logs" with subtitle "PM Updates" or just keep simple
3. Add notification badge showing count of logs awaiting response today

**New nav order:**
```
Overview
Projects  
Field Ops
Daily Logs  ← moved up, add badge
Payments
Contractors
Change Orders
Budget Dashboard
Settings
```

**Acceptance:**
- [ ] Daily Logs appears after Field Ops
- [ ] Badge shows count of pending/today's requests
- [ ] Badge updates when data changes

---

## Priority 3: Standardize Empty States

**Create new component:** `src/app/components/ui/EmptyState.tsx`

**Component props:**
```typescript
interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}
```

**Design:**
- Centered layout with muted icon (48px)
- Title in semibold
- Description in muted text explaining what goes here and how to add it
- Optional primary button for main action

**Apply to these views:**

| View | Empty State Message | Action |
|------|---------------------|--------|
| PaymentsView | "No payment applications yet" / "Start by selecting contractors from a project and requesting payment." | "Go to Projects" |
| ContractorsView | "No contractors added" / "Add your subcontractors to start tracking payments and contracts." | "Add Contractor" |
| ChangeOrdersView | "No change orders" / "Change orders will appear here when scope changes on a project." | "Create Change Order" |
| DailyLogsView | "No daily log requests" / "Set up automated SMS requests to get daily updates from your PM." | "Add Request" |
| ProjectsView (no projects) | "No projects yet" / "Create your first project to start tracking budgets and payments." | "New Project" |
| Field Ops > Photos | "No photos uploaded" / "Photos from job sites will appear here." | "Upload Photos" |

**Acceptance:**
- [ ] EmptyState component created and exported
- [ ] All listed views use EmptyState when data is empty
- [ ] Actions navigate to correct flow or open correct modal

---

## Priority 4: Add Cash Flow Placeholder to Budget Dashboard

**File:** `src/app/components/BudgetDashboard.tsx`

**Where:** Add as a new card/section below the existing charts, before the DataTable.

**Content:**
```
Card with dashed border or subtle background:

[TrendingUp icon]

Cash Flow Projection
Coming Soon

Track when payments are due out and when draws are expected in. 
Project your cash position 30/60/90 days out.

[Notify Me When Ready] button (optional - can just be static)
```

**Styling:**
- Use `border-dashed border-2 border-muted` for "coming soon" feel
- Muted text colors
- Icon in muted color
- Height ~150px, full width

**Acceptance:**
- [ ] Placeholder visible in Budget Dashboard
- [ ] Does not break existing layout
- [ ] Clearly reads as "future feature"

---

## Priority 5: Fix Modal Stacking Patterns

**Audit these files for nested modals:**
- `src/app/components/ContractorsView.tsx`
- `src/app/components/ContractorDetailView.tsx`
- `src/app/components/ProjectDetailView.tsx`
- `src/app/components/PaymentsView.tsx`
- `src/app/components/PMDashboard.tsx`

**Pattern to fix:**
If clicking something in a modal opens ANOTHER modal on top, refactor to one of:

Option A: **Replace** the modal content instead of stacking
```typescript
// Instead of: open second modal while first is open
// Do: setModalContent('contractor-detail') → setModalContent('payment-detail')
```

Option B: **Navigate** to a full page/view instead of modal
```typescript
// Instead of: modal → modal
// Do: modal → router.push('/payments/123')
```

Option C: **Use tabs/sections** within the modal
```typescript
// Instead of: modal → modal for related content
// Do: modal with tabs [Overview | Payments | Contracts]
```

**Specific fixes to check:**

1. **ContractorDetailView:** If viewing contractor opens modal, and clicking a payment opens another modal → replace with tabs inside the detail view

2. **PMDashboard ProjectOverview:** Has nested modals for contracts, payments, daily logs → convert to tabs within the project modal

3. **PaymentsView detail:** If payment detail opens modal and "view contractor" opens another → navigate to Contractors tab instead

**Acceptance:**
- [ ] No view has more than one modal/drawer open at a time
- [ ] Back/close behavior is always predictable
- [ ] User never has to close multiple layers to get back to main view

---

## Priority 6: Minor Navigation Cleanup

**File:** `src/app/components/Navigation.tsx`

1. Remove "Manage View" if it exists as a nav item (user confirmed they don't see it, but verify it's fully removed)

2. Verify role-based filtering is working correctly:
   - Admin sees all tabs
   - PM sees: Overview, Projects, Daily Logs, Payments, Contractors
   - Staff sees: Overview, Projects, Field Ops

**Acceptance:**
- [ ] No "Manage" tab visible in any role
- [ ] PM role has appropriate limited nav

---

## Testing Checklist

After all changes:

- [ ] Header project selector works and persists
- [ ] Daily Logs is visually prominent in nav
- [ ] All empty states display helpful messages with actions
- [ ] Budget Dashboard shows cash flow placeholder
- [ ] No modal stacking anywhere in the app
- [ ] Navigation order matches spec
- [ ] No console errors
- [ ] Mobile responsive still works

---

## Files to Modify Summary

| File | Changes |
|------|---------|
| `Header.tsx` | Add project selector dropdown |
| `Navigation.tsx` | Reorder items, add Daily Logs badge |
| `ui/EmptyState.tsx` | NEW - create component |
| `PaymentsView.tsx` | Add empty state, check modal patterns |
| `ContractorsView.tsx` | Add empty state, check modal patterns |
| `ChangeOrdersView.tsx` | Add empty state |
| `DailyLogsView.tsx` | Add empty state |
| `ProjectsView.tsx` | Add empty state |
| `PhotoGalleryView.tsx` | Add empty state |
| `BudgetDashboard.tsx` | Add cash flow placeholder card |
| `ContractorDetailView.tsx` | Fix modal stacking if present |
| `PMDashboard.tsx` | Fix modal stacking if present |

---

## Implementation Order

1. **EmptyState component** (unblocks multiple views)
2. **Header project selector** (high visibility improvement)
3. **Navigation reorder + Daily Logs badge**
4. **Apply EmptyState to all views**
5. **Budget Dashboard placeholder**
6. **Modal stacking audit and fixes**

Each step is independently deployable. Test after each.
