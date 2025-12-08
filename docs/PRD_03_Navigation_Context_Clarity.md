# PRD-03: Navigation & Project Context Clarity

## Overview
**Priority:** Medium (UX Polish)  
**Estimated Time:** 1-2 days  
**Dependencies:** PRD-01, PRD-02  

Current navigation creates confusion about whether users are in a "global" view or a "project-specific" context. This PRD clarifies the information architecture and adds a global project selector for quick context switching.

---

## Problem Statement

The app has two modes that aren't clearly distinguished:

1. **Global Mode**: View all payments across all projects, all contractors, etc.
2. **Project Mode**: View details for a specific project

Current friction:
- User on "Payments" tab sees ALL payments but might expect just their active project
- No persistent project selector - must go back to Projects list
- Unclear when viewing project-specific vs portfolio-wide data
- AppFolio-style navigation pattern would help (you referenced this)

---

## Solution: Contextual Navigation

### Design Principles

1. **Global views are for "what needs attention across everything"**
2. **Project views are for "working on this specific job"**
3. **Always show current context clearly**
4. **Quick project switching without losing place**

---

## Wireframe: Global Navigation with Project Context

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────┐                                    │
│  │ 🏗️ Construction Ops                 │  [🔍 Search]  [👤 Alex ▼]         │
│  └─────────────────────────────────────┘                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📍 Current Project: [Select Project ▼]  ← or shows "123 Main St ▼"  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────┬────────────┬──────────────┬─────────────┬──────────────────┐ │
│  │Dashboard │ Projects   │ Payments     │ Contractors │ Change Orders    │ │
│  │ (global) │ (global)   │ (contextual) │ (contextual)│ (contextual)     │ │
│  └──────────┴────────────┴──────────────┴─────────────┴──────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Behavior by Tab

| Tab | No Project Selected | Project Selected |
|-----|--------------------|--------------------|
| Dashboard | Shows all pending items | Shows pending items for this project |
| Projects | Shows all projects | Shows all projects (selector stays) |
| Payments | Shows ALL payments | Shows payments for selected project |
| Contractors | Shows ALL contractors | Shows contractors on selected project |
| Change Orders | Shows ALL change orders | Shows COs for selected project |

---

## Phase 1: Global Project Selector

### Files to Create/Modify
```
src/app/context/ProjectContext.tsx (modify if exists, create if not)
src/app/components/layout/ProjectSelector.tsx (new)
src/app/components/layout/Header.tsx or MainLayout.tsx (modify)
```

### Implementation

**Step 1.1: Project Context**

Enhance or create ProjectContext to track selected project globally:

```typescript
// src/app/context/ProjectContext.tsx
interface ProjectContextType {
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  clearProject: () => void;
}

// Persist selection in localStorage for session continuity
useEffect(() => {
  const saved = localStorage.getItem('selectedProjectId');
  if (saved) {
    // Fetch and set project
  }
}, []);

useEffect(() => {
  if (selectedProject) {
    localStorage.setItem('selectedProjectId', selectedProject.id);
  } else {
    localStorage.removeItem('selectedProjectId');
  }
}, [selectedProject]);
```

**Step 1.2: Project Selector Component**

```typescript
// src/app/components/layout/ProjectSelector.tsx
interface ProjectSelectorProps {
  // Uses ProjectContext internally
}

// Dropdown showing:
// - "All Projects" option (clears selection)
// - Divider
// - Active projects (sorted by recent activity)
// - Divider  
// - Completed projects (collapsed by default)

// Visual states:
// - No selection: "Select Project ▼" with dotted border
// - Selected: "📍 123 Main St ▼" with solid border, project color accent
```

**Step 1.3: Add to Header**

Position below main logo/title, above nav tabs:

```typescript
<header>
  <div className="flex justify-between items-center">
    <Logo />
    <div className="flex items-center gap-4">
      <Search />
      <UserMenu />
    </div>
  </div>
  <ProjectSelector />  {/* New */}
  <Navigation />
</header>
```

### Testing Checklist
- [ ] Selector shows all active projects
- [ ] Selecting project updates context
- [ ] "All Projects" option clears selection
- [ ] Selection persists on page refresh
- [ ] Selection persists across tab changes
- [ ] Dropdown closes when clicking outside
- [ ] Keyboard navigation works (arrow keys, enter, escape)

---

## Phase 2: Context-Aware Data Fetching

### Files to Modify
```
src/app/components/PaymentApplicationsView.tsx
src/app/components/ContractorsView.tsx
src/app/components/ChangeOrdersView.tsx
```

### Implementation

**Step 2.1: Update API Calls**

Each view should check ProjectContext and filter accordingly:

```typescript
// In PaymentApplicationsView.tsx
const { selectedProject } = useProjectContext();

const fetchPayments = async () => {
  const url = selectedProject 
    ? `/api/payment-applications?projectId=${selectedProject.id}`
    : '/api/payment-applications';
  // ...
};

// Re-fetch when selectedProject changes
useEffect(() => {
  fetchPayments();
}, [selectedProject?.id]);
```

**Step 2.2: Visual Context Indicator**

When filtered, show a subtle indicator:

```typescript
{selectedProject && (
  <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm mb-4">
    Showing payments for {selectedProject.name}
    <button onClick={clearProject} className="ml-2 hover:underline">
      Show all
    </button>
  </div>
)}
```

**Step 2.3: Update Empty States**

Contextual empty messages:

```typescript
// No project selected, no payments
"No payment applications yet. Create one from a project's Contractors tab."

// Project selected, no payments for that project
"No payment applications for {projectName}. Request a payment from the Contractors tab."
```

### Testing Checklist
- [ ] Payments view filters when project selected
- [ ] Contractors view filters when project selected
- [ ] Change Orders view filters when project selected
- [ ] "Show all" link clears filter
- [ ] Context indicator visible when filtered
- [ ] Empty states are context-appropriate
- [ ] URL doesn't break when switching projects

---

## Phase 3: Quick Project Switch from List Items

### Implementation

When viewing filtered data, allow quick switch to a different project from the list itself:

```typescript
// In payment application row/card
<span 
  className="text-blue-600 hover:underline cursor-pointer"
  onClick={() => setSelectedProject(payment.project)}
>
  {payment.projectName}
</span>
```

This allows:
1. View all payments (no project selected)
2. See a payment for "456 Oak Ave"
3. Click project name → instantly filtered to that project
4. Continue working in project context

### Testing Checklist
- [ ] Clicking project name in list sets context
- [ ] View updates to show only that project's items
- [ ] Project selector updates to show new selection

---

## Phase 4: Breadcrumb Navigation

### Files to Create
```
src/app/components/layout/Breadcrumb.tsx
```

### Implementation

Show navigation path when in nested views:

```
Dashboard                           (no breadcrumb needed)
Projects                            (no breadcrumb needed)
Projects > 123 Main St              (in project detail)
Projects > 123 Main St > Payments   (in project payments tab)
Payments > PA-0047                  (viewing specific payment)
```

```typescript
interface BreadcrumbProps {
  items: Array<{
    label: string;
    href?: string;
    onClick?: () => void;
  }>;
}

// Usage
<Breadcrumb items={[
  { label: 'Projects', href: '/projects' },
  { label: project.name, href: `/projects/${project.id}` },
  { label: 'Payments' }  // Current page, no link
]} />
```

Position: Below project selector, above page content.

### Testing Checklist
- [ ] Breadcrumbs show on nested pages
- [ ] Clicking parent navigates correctly
- [ ] Current item is not a link
- [ ] Hidden on top-level pages (Dashboard, Projects list)

---

## Phase 5: Navigation Tab Indicators

### Implementation

Show visual indicators on nav tabs when project is selected:

```typescript
// Navigation tabs when project selected
<NavTab href="/payments" active={currentPath === '/payments'}>
  Payments
  {selectedProject && (
    <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full inline-block" />
  )}
</NavTab>
```

This subtle dot indicates "this view is filtered to current project."

Alternative: Show count badge
```typescript
<NavTab>
  Payments
  {selectedProject && pendingCount > 0 && (
    <span className="ml-1 bg-red-500 text-white text-xs px-1.5 rounded-full">
      {pendingCount}
    </span>
  )}
</NavTab>
```

### Testing Checklist
- [ ] Indicator appears when project selected
- [ ] Indicator hidden when no project selected
- [ ] Counts update in real-time (if using count badges)

---

## Phase 6: Keyboard Shortcuts

### Implementation

Add keyboard shortcuts for power users:

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open project selector / global search |
| `Cmd/Ctrl + P` | Quick switch project (opens selector) |
| `Escape` | Clear project selection (when selector closed) |
| `G then D` | Go to Dashboard |
| `G then P` | Go to Projects |

```typescript
// src/hooks/useKeyboardShortcuts.ts
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openProjectSelector();
    }
    // ... etc
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```

### Testing Checklist
- [ ] Cmd+K opens selector
- [ ] Escape clears selection
- [ ] Shortcuts don't fire when typing in inputs
- [ ] Works on both Mac (Cmd) and Windows (Ctrl)

---

## Information Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                     GLOBAL LEVEL                                │
│  (No project selected - see everything)                         │
│                                                                 │
│  Dashboard ─── All pending items across portfolio               │
│  Projects ──── List of all projects                             │
│  Payments ──── All payment applications                         │
│  Contractors ─ All contractors in system                        │
│  Change Orders All COs across projects                          │
└─────────────────────────────────────────────────────────────────┘
                           │
                    [Select Project]
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PROJECT LEVEL                                │
│  (Project selected - filtered view)                             │
│                                                                 │
│  Dashboard ─── Pending items for THIS project                   │
│  Projects ──── Still shows all (but current highlighted)        │
│  Payments ──── Payments for THIS project only                   │
│  Contractors ─ Contractors on THIS project only                 │
│  Change Orders COs for THIS project only                        │
│                                                                 │
│  ──────────────────────────────────────────────────────         │
│  Project Detail View (Subtabs):                                 │
│    Overview | Budget | Contractors | Payments | Schedule        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Completion Criteria

- [ ] Project selector visible in header
- [ ] Selection persists across navigation
- [ ] All list views filter when project selected
- [ ] "Show all" option clears filter
- [ ] Context indicator visible when filtered
- [ ] Clicking project name in list items switches context
- [ ] Breadcrumbs show on nested pages
- [ ] Keyboard shortcuts work (Cmd+K at minimum)
- [ ] Mobile: selector is touch-friendly dropdown
- [ ] No console errors
