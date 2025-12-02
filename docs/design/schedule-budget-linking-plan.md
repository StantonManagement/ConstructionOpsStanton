# Schedule-Budget Linking - Implementation Plan

## Overview

Add schedule access from Project Detail page with a visual swim-lane interface for linking tasks to budget categories. Users drag tasks into budget category lanes or bulk-assign via multi-select.

---

## Navigation Changes

### Add Schedule Subtab to Project Detail

**File:** `ProjectDetailView.tsx`

Current subtabs: `[Details] [Contractors] [Budget] [Payments] [Punch Lists] [Docs]`

New subtabs: `[Details] [Contractors] [Budget] [Schedule ◄] [Payments] [Punch Lists] [Docs]`

**Behavior:**
- Schedule subtab shows project-scoped schedule with budget linking UI
- "Open Full View" link in top-right navigates to main ScheduleView with project pre-selected

---

## New Component: Schedule Subtab with Swim Lanes

### Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Project: Highland Plaza                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ [Details] [Contractors] [Budget] [Schedule ◄] [Payments] [Punch] [Docs]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PROJECT SCHEDULE                                          [Open Full View] │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ View: [Swim Lanes ▼]      [+ Add Task]      Feb 2025 ──────────►   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                        │ W1  │ W2  │ W3  │ W4  │ W5  │ W6  │       │   │
│  ├────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┤       │   │
│  │ ⚠️ UNASSIGNED (3)      │     │     │     │     │     │     │       │   │
│  │ ├─ Permit pickup       │ ▓▓▓ │     │     │     │     │     │       │   │
│  │ ├─ Final inspection    │     │     │     │     │     │ ▓▓▓ │       │   │
│  │ └─ Punch list walk     │     │     │     │     │ ▓▓▓ │     │       │   │
│  ├────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┤       │   │
│  │ 🔌 ELECTRICAL ($45k)   │     │     │     │     │     │     │       │   │
│  │ ├─ Rough-in            │ ▓▓▓▓▓▓▓▓ │     │     │     │     │       │   │
│  │ ├─ Panel install       │     │     │ ▓▓▓ │     │     │     │       │   │
│  │ └─ Finish electrical   │     │     │     │     │ ▓▓▓▓▓▓▓▓ │       │   │
│  ├────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┤       │   │
│  │ 🔧 PLUMBING ($38k)     │     │     │     │     │     │     │       │   │
│  │ ├─ Rough plumbing      │ ▓▓▓▓▓▓▓▓ │     │     │     │     │       │   │
│  │ └─ Fixtures            │     │     │     │     │ ▓▓▓ │     │       │   │
│  ├────────────────────────┼─────┼─────┼─────┼─────┼─────┼─────┤       │   │
│  │ 🪵 FRAMING ($52k)      │     │     │     │     │     │     │       │   │
│  │ └─ (no tasks linked)   │     │     │     │     │     │     │ [+]   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  💡 Drag tasks between lanes to assign budget categories                   │
│     or multi-select tasks and use "Assign to..." dropdown                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Interaction Patterns

### 1. Drag to Assign

**Behavior:**
- Drag task bar from one swim lane to another
- Task moves visually to new lane
- `budget_category_id` updates in database
- Toast: "Task assigned to Electrical"

**Visual feedback:**
- Dragging task shows ghost outline
- Valid drop zones highlight with dashed border
- Invalid zones (if any) show red X

### 2. Multi-Select + Bulk Assign

**Behavior:**
- Click task to select (checkbox appears, task highlights)
- Shift+click for range select
- Cmd/Ctrl+click for toggle select
- Selection toolbar appears at bottom

**Selection toolbar:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3 tasks selected    [Assign to: ▼ Electrical]    [Clear Selection]         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3. Quick Add to Lane

**Behavior:**
- Each lane has small [+] button on right
- Click [+] opens TaskFormModal with budget_category pre-filled
- New task appears in that lane

### 4. View Toggle

**Options in dropdown:**
- **Swim Lanes** (default): Grouped by budget category
- **Timeline**: Standard Gantt, no grouping
- **List**: Table view with budget category column

---

## Swim Lane Details

### Lane Header Content

```
🔌 ELECTRICAL ($45,000)                    3 tasks • 2.5 weeks
   ████████████░░░░░░░░  $28,000 in linked work
```

**Shows:**
- Icon (auto-assigned by category name or manual)
- Category name
- Budget amount
- Task count
- Total duration of linked tasks
- Mini progress bar: estimated cost of linked tasks vs budget

### Unassigned Lane

**Always at top, visually distinct:**
- Yellow/orange background tint
- Warning icon
- Count badge: "⚠️ UNASSIGNED (3)"
- Goal: Empty this lane = all work is budget-tracked

### Empty Lanes

**When budget category has no linked tasks:**
- Show "(no tasks linked)" in italic gray
- [+] button more prominent
- Consider: Hide empty lanes toggle?

---

## Database Changes

### Add to schedule_tasks table

```sql
ALTER TABLE schedule_tasks 
ADD COLUMN budget_category_id INTEGER REFERENCES budget_categories(id);

CREATE INDEX idx_schedule_tasks_budget_cat ON schedule_tasks(budget_category_id);
```

### Ensure budget_categories exists

```sql
CREATE TABLE IF NOT EXISTS budget_categories (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) NOT NULL,
    name VARCHAR(100) NOT NULL,
    budgeted_amount DECIMAL(12,2) DEFAULT 0,
    icon VARCHAR(50),  -- emoji or icon name
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_budget_categories_project ON budget_categories(project_id);
```

---

## API Endpoints

```
GET  /api/projects/:id/schedule-with-budget
     Returns: tasks grouped by budget_category_id, plus category metadata

PUT  /api/schedule-tasks/:taskId/budget-category
     Body: { budget_category_id: number | null }
     Assigns single task to category

PUT  /api/schedule-tasks/bulk-assign
     Body: { task_ids: number[], budget_category_id: number | null }
     Bulk assignment
```

---

## File Structure

```
components/
├── schedule/
│   ├── ProjectScheduleTab.tsx       # New: Schedule subtab for Project Detail
│   ├── SwimLaneGantt.tsx            # New: Gantt grouped by budget category
│   ├── SwimLane.tsx                 # New: Individual lane component
│   ├── DraggableTask.tsx            # New: Task bar with drag handling
│   ├── SelectionToolbar.tsx         # New: Bottom bar for bulk actions
│   ├── GanttChartContainer.tsx      # Existing: Add swim lane view option
│   └── TaskFormModal.tsx            # Existing: Add budget_category dropdown
```

---

## Implementation Steps

### Step 1: Database & API (1-2 hours)
- Add migration for `budget_category_id` on schedule_tasks
- Create budget_categories table if missing
- Add API endpoints for assignment

### Step 2: ProjectScheduleTab Shell (1-2 hours)
- Create new component
- Add as subtab in ProjectDetailView
- Wire up project filter
- Add "Open Full View" navigation

### Step 3: SwimLaneGantt Component (3-4 hours)
- Query tasks grouped by budget_category_id
- Render lanes with headers
- Show Unassigned lane at top
- Basic task bars (no drag yet)

### Step 4: Drag-to-Assign (2-3 hours)
- Add @dnd-kit to swim lanes
- DraggableTask component
- Drop handlers update budget_category_id
- Optimistic UI update + API call

### Step 5: Multi-Select + Bulk Assign (2-3 hours)
- Selection state management
- SelectionToolbar component
- Bulk assignment API call
- Clear selection after assign

### Step 6: Polish (1-2 hours)
- Empty lane states
- Lane header progress bars
- View toggle (swim lanes / timeline / list)
- Help tooltip for first-time users

---

## Testing Checklist

- [ ] Schedule subtab appears in Project Detail
- [ ] Tasks display in correct swim lanes based on budget_category_id
- [ ] Unassigned tasks appear in Unassigned lane
- [ ] Drag task from Unassigned to Electrical → updates DB
- [ ] Drag task from Electrical to Plumbing → updates DB
- [ ] Multi-select 3 tasks → bulk assign → all update
- [ ] [+] button in lane opens TaskFormModal with category pre-filled
- [ ] Empty lanes show "(no tasks linked)" message
- [ ] "Open Full View" navigates to ScheduleView with project selected
- [ ] View toggle switches between swim lanes and standard timeline

---

## Visual Design Notes

### Lane Colors
- Unassigned: Light orange/amber background (#FEF3C7)
- Budget lanes: Light gray background (#F9FAFB)
- Selected task: Blue outline (#3B82F6)
- Drag ghost: 50% opacity, slight scale up

### Lane Header Hierarchy
- Category name: font-semibold text-sm
- Budget amount: text-sm text-gray-600
- Stats (tasks, duration): text-xs text-gray-500

### Task Bars
- Default: Solid color based on status (blue=in progress, green=complete, gray=pending)
- Linked to budget: Small $ icon on left edge
- Selected: Blue ring, checkmark overlay

---

## Not In Scope (This Phase)

- Cost estimation per task (just linking for now)
- Editing budget categories from schedule view
- Dependencies between tasks in different lanes
- Collapsible lanes
- Filtering lanes by date range
