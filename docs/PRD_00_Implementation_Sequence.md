# PRD-00: Implementation Sequence & Master Checklist

## Overview

This document outlines the recommended order for implementing PRDs 01-04 and provides a master checklist for tracking progress.

---

## Dependency Graph

```
PRD-01: Project Detail Fixes
    │
    ├──► PRD-04: Contractor → Payment Flow (depends on Contractors tab)
    │
    └──► PRD-02: Dashboard Action Queue (depends on budget calculations)
              │
              └──► PRD-03: Navigation Context (depends on Dashboard existing)
```

---

## Recommended Implementation Order

### Week 1: Foundation

**Day 1-2: PRD-01 Phases 1-2**
- [ ] Fix budget card calculations (API + UI)
- [ ] Change default tab to Contractors
- [ ] Test: Cards show real data, correct tab opens

**Day 3-4: PRD-01 Phases 3-4**
- [ ] Implement Contractors tab with cards
- [ ] Add drag-and-drop reordering
- [ ] Fix "Remaining" label
- [ ] Test: Contractor cards display, can reorder

**Day 5: PRD-01 Phase 5 + Buffer**
- [ ] Implement Payments sub-tab
- [ ] Bug fixes and polish
- [ ] Test: Full project detail page functional

### Week 2: Core Workflow

**Day 1-2: PRD-04 Phases 1-2**
- [ ] Enhance contractor card data (payment status)
- [ ] Update card UI (4-column, quick status)
- [ ] Test: Cards show payment status inline

**Day 3: PRD-04 Phases 3-4**
- [ ] Enhance Request Payment modal
- [ ] Add inline payment history
- [ ] Test: Modal pre-fills, history shows

**Day 4-5: PRD-04 Phases 5-6**
- [ ] Implement quick actions (Approve, Pay)
- [ ] Create contractor drawer
- [ ] Test: Full flow works without navigation

### Week 3: Dashboard & Navigation

**Day 1-2: PRD-02 Phases 1-3**
- [ ] Create Dashboard route and layout
- [ ] Build summary API
- [ ] Build action queue API
- [ ] Test: Dashboard loads with data

**Day 3-4: PRD-02 Phases 4-6**
- [ ] Build dashboard components (StatCard, ActionQueue, etc.)
- [ ] Implement quick actions
- [ ] Add recent activity feed
- [ ] Test: Full dashboard functional

**Day 5: PRD-03 Phases 1-2**
- [ ] Create global project selector
- [ ] Implement context-aware filtering
- [ ] Test: Selection persists, views filter

### Week 4: Polish

**Day 1-2: PRD-03 Phases 3-6**
- [ ] Quick project switch from list items
- [ ] Breadcrumb navigation
- [ ] Tab indicators
- [ ] Keyboard shortcuts
- [ ] Test: Navigation fully contextual

**Day 3-5: Integration & QA**
- [ ] End-to-end testing
- [ ] Mobile responsive testing
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Documentation updates

---

## Master Checklist

### PRD-01: Project Detail Page Fixes
- [ ] **Phase 1:** Budget card calculations
  - [ ] Summary API endpoint created
  - [ ] Cards display real values
  - [ ] Calculations verified accurate
- [ ] **Phase 2:** Default tab
  - [ ] Contractors tab opens by default
- [ ] **Phase 3:** Contractors tab
  - [ ] Contractor cards display
  - [ ] All data fields shown
  - [ ] Drag-and-drop works
  - [ ] Order persists
  - [ ] Action buttons work
- [ ] **Phase 4:** Label fix
  - [ ] "Budget remaining" label updated
- [ ] **Phase 5:** Payments tab
  - [ ] Project-filtered payments display
  - [ ] Actions work

### PRD-02: Dashboard Action Queue
- [ ] **Phase 1:** Dashboard route
  - [ ] /dashboard route exists
  - [ ] Navigation includes Dashboard
  - [ ] Root redirects to dashboard
- [ ] **Phase 2:** Summary API
  - [ ] Returns correct counts
  - [ ] Returns correct amounts
- [ ] **Phase 3:** Queue API
  - [ ] Groups by urgency
  - [ ] Includes both PAs and COs
  - [ ] Sorted correctly
- [ ] **Phase 4:** Components
  - [ ] StatCards display
  - [ ] ActionQueue displays
  - [ ] ActionItems clickable
  - [ ] Sections collapse
- [ ] **Phase 5:** Quick actions
  - [ ] Quick approve works
  - [ ] Mark paid works
  - [ ] Toast notifications show
- [ ] **Phase 6:** Recent activity
  - [ ] Feed displays
  - [ ] Relative times correct

### PRD-03: Navigation Context Clarity
- [ ] **Phase 1:** Project selector
  - [ ] Selector in header
  - [ ] All projects listed
  - [ ] Selection persists
- [ ] **Phase 2:** Context-aware filtering
  - [ ] Payments filters
  - [ ] Contractors filters
  - [ ] Change Orders filters
  - [ ] "Show all" works
- [ ] **Phase 3:** Quick switch
  - [ ] Click project name switches context
- [ ] **Phase 4:** Breadcrumbs
  - [ ] Show on nested pages
  - [ ] Navigation works
- [ ] **Phase 5:** Tab indicators
  - [ ] Dot/badge shows when filtered
- [ ] **Phase 6:** Keyboard shortcuts
  - [ ] Cmd+K works
  - [ ] Other shortcuts work

### PRD-04: Contractor → Payment Flow
- [ ] **Phase 1:** Enhanced data
  - [ ] API returns payment status
  - [ ] All calculated fields correct
- [ ] **Phase 2:** Card UI
  - [ ] 4-column money display
  - [ ] Quick status section
  - [ ] Progress bar segments
- [ ] **Phase 3:** Request Payment modal
  - [ ] Pre-fills contractor
  - [ ] Shows context panel
  - [ ] Validates amounts
- [ ] **Phase 4:** Payment history
  - [ ] Expandable in card
  - [ ] Full history shows
- [ ] **Phase 5:** Quick actions
  - [ ] Approve works
  - [ ] Pay works
  - [ ] Role-based visibility
- [ ] **Phase 6:** Contractor drawer
  - [ ] Opens on card click
  - [ ] Full details display
  - [ ] Actions work from drawer

---

## Testing Scenarios

### Scenario 1: New Payment Request
1. Open project from Projects list
2. Verify Contractors tab is default
3. Click contractor card → drawer opens
4. Click "Request Payment"
5. Verify contractor pre-selected
6. Verify context panel shows correct amounts
7. Enter amount, submit
8. Verify card updates with pending item
9. Verify dashboard shows new pending item

### Scenario 2: Approve and Pay
1. Go to Dashboard
2. Find pending item in Action Queue
3. Click Review → verify details
4. Quick Approve → verify moves to "Ready to Pay"
5. Mark Paid → verify removed from queue
6. Go to project → verify contractor card updated
7. Expand payment history → verify payment shows as paid

### Scenario 3: Project Context Switching
1. Start on Dashboard (no project selected)
2. Verify all pending items shown
3. Select project from dropdown
4. Verify dashboard filters to that project
5. Go to Payments tab
6. Verify only that project's payments shown
7. Click different project name in list
8. Verify selector updates
9. Verify view filters to new project
10. Click "Show all" → verify returns to global view

### Scenario 4: Mobile Workflow
1. Open on mobile device (375px)
2. Verify responsive layout
3. Open project selector → verify touch-friendly
4. Navigate to project → verify cards stack
5. Expand contractor card → verify readable
6. Request payment → verify form usable
7. Dashboard → verify stat cards stack

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Budget calculations wrong | Write unit tests for calculation logic |
| Drag-drop breaks existing data | Backup display_order before changes |
| Quick actions cause errors | Add confirmation dialogs, undo option |
| Context filtering confuses users | Always show "Showing X for [Project]" indicator |
| Mobile layout breaks | Test at 375px, 768px, 1024px breakpoints |
| Performance with many contractors | Implement virtual scrolling if >50 items |

---

## Success Metrics

After implementation:
- [ ] User can complete payment request in <30 seconds
- [ ] User can see all pending items in one view (Dashboard)
- [ ] User can switch project context without losing place
- [ ] Mobile users can complete core workflows
- [ ] Zero "where do I go to do X?" questions

---

## Files Changed Summary

### New Files
```
src/app/dashboard/page.tsx
src/app/components/dashboard/DashboardView.tsx
src/app/components/dashboard/StatCard.tsx
src/app/components/dashboard/ActionQueue.tsx
src/app/components/dashboard/ActionItem.tsx
src/app/components/dashboard/RecentActivity.tsx
src/app/components/project/ContractorCard.tsx
src/app/components/project/ContractorDrawer.tsx
src/app/components/project/ContractorPaymentHistory.tsx
src/app/components/project/ProjectPaymentsTab.tsx
src/app/components/layout/ProjectSelector.tsx
src/app/components/layout/Breadcrumb.tsx
src/app/api/dashboard/summary/route.ts
src/app/api/dashboard/queue/route.ts
src/app/api/dashboard/activity/route.ts
src/app/api/projects/[id]/summary/route.ts
src/app/api/projects/[id]/contractors/[contractorId]/payments/route.ts
src/hooks/useKeyboardShortcuts.ts
```

### Modified Files
```
src/app/page.tsx (redirect to dashboard)
src/app/components/ProjectDetailView.tsx
src/app/components/PaymentApplicationsView.tsx
src/app/components/ContractorsView.tsx
src/app/components/ChangeOrdersView.tsx
src/app/components/modals/RequestPaymentModal.tsx
src/app/context/ProjectContext.tsx
src/app/api/projects/[id]/contractors/route.ts
Main layout/navigation components
```
