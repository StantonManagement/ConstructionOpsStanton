# Gantt Chart Implementation Plan - COMPLETED

**Status:** Implemented (Phase 4 Upgrade)
**Completion Date:** Dec 1, 2025
**Library Used:** `frappe-gantt`

## Overview

This plan has been fully executed. The system now uses `frappe-gantt` for the timeline visualization, replacing the previous simple React implementation.

## Implemented Features

- **Gantt Library:** `frappe-gantt` integrated via `GanttChart.tsx` wrapper.
- **Database:** 
  - New `task_dependencies` table created.
  - `schedule_tasks` updated with `duration_days` and `is_milestone`.
- **API:**
  - `/api/projects/[id]/gantt` serves formatted Gantt data.
  - `/api/tasks/[id]/dependencies` handles dependency CRUD.
- **UI Components:**
  - **ScheduleView:** Switched to use the new Gantt component.
  - **TaskFormModal:** Redesigned as a draggable, non-blocking tool window with 2-column layout and dependency management.

## Original Plan Reference (Archived)

### Objective

Replace the current budget-category swimlane timeline with a full-featured Gantt chart that supports dependencies, drag-to-reschedule, and auto-scheduling. Use a proven Gantt library rather than building from scratch.

---

## Phase 1: Library Selection & Installation (DONE)

### Recommended Library: frappe-gantt

**Why frappe-gantt:**
- Open source (MIT license)
- Lightweight (~30kb)
- Built-in dependency arrows
- Drag to reschedule and resize
- Progress visualization
- No framework lock-in (vanilla JS, works with React)
- Active maintenance

**Alternative if frappe-gantt doesn't meet needs:** dhtmlx-gantt (more features, but freemium model)

### Installation Steps (DONE)

1. Install the package:
   ```
   npm install frappe-gantt
   ```

2. The library requires its CSS file to be imported for proper styling

3. Create a React wrapper component since frappe-gantt is vanilla JS

---

## Phase 2: Database Schema Changes (DONE)

### New Table: task_dependencies

Create a new table to store dependency relationships with type and lag time.

**Fields:**
- `id` - Primary key
- `project_id` - Foreign key to projects table
- `predecessor_task_id` - Foreign key to tasks table (the task that must complete first)
- `successor_task_id` - Foreign key to tasks table (the task that waits)
- `dependency_type` - VARCHAR(2), one of: 'FS', 'FF', 'SS', 'SF'
  - FS = Finish-to-Start (most common: B starts when A finishes)
  - FF = Finish-to-Finish (B finishes when A finishes)
  - SS = Start-to-Start (B starts when A starts)
  - SF = Start-to-Finish (rare: B finishes when A starts)
- `lag_days` - INTEGER, positive = delay, negative = overlap
- `created_at` - Timestamp
- `updated_at` - Timestamp

**Constraints:**
- Unique constraint on (predecessor_task_id, successor_task_id) - no duplicate dependencies
- Check constraint: predecessor_task_id != successor_task_id - task can't depend on itself

### Modify Existing Tasks Table (DONE)

Add these fields if not present:
- `duration_days` - INTEGER, calculated or manually set
- `progress` - INTEGER (0-100), percent complete
- `is_milestone` - BOOLEAN, milestones have zero duration
- `constraint_type` - VARCHAR(20), nullable: 'ASAP', 'MUST_START_ON', 'START_NO_EARLIER', 'START_NO_LATER'
- `constraint_date` - DATE, nullable, used with constraint_type

### Migration Notes (DONE)

- Migrate existing predecessor data from the current array/multi-select format into the new task_dependencies table
- Default all migrated dependencies to type 'FS' with lag_days = 0
- Calculate and populate duration_days from existing start_date and end_date

---

## Phase 3: API Endpoints (DONE)

### New Endpoints Needed

**GET /api/projects/[projectId]/gantt**
- Returns all tasks for the project formatted for the Gantt library
- Includes dependency relationships
- Response shape should match frappe-gantt's expected format:
  ```
  {
    tasks: [
      {
        id: string,
        name: string,
        start: string (YYYY-MM-DD),
        end: string (YYYY-MM-DD),
        progress: number,
        dependencies: string (comma-separated predecessor IDs),
        custom_class: string (optional, for styling by status/category)
      }
    ]
  }
  ```

**POST /api/tasks/[taskId]/reschedule**
- Called when user drags a task bar
- Body: { start_date, end_date }
- Should trigger cascade recalculation of dependent tasks

**POST /api/tasks/[taskId]/dependencies**
- Add a new dependency
- Body: { predecessor_id, dependency_type, lag_days }

**DELETE /api/tasks/[taskId]/dependencies/[dependencyId]**
- Remove a dependency

**PUT /api/tasks/[taskId]/progress**
- Update task progress percentage
- Body: { progress }

### Modify Existing Endpoints

**PUT /api/tasks/[taskId]**
- Add handling for duration_days field
- When duration changes, auto-calculate end_date from start_date
- When start_date or end_date changes, auto-calculate duration_days
- Trigger dependency cascade when dates change

---

## Phase 4: Auto-Scheduling Logic (PARTIALLY DONE)

### Server-Side Cascade Function

Create a function that recalculates dates when a task changes:

**Logic:**
1. When a task's end_date changes, find all tasks that depend on it (where this task is the predecessor)
2. For each dependent task:
   - Calculate new start_date based on dependency type and lag
   - FS: successor.start = predecessor.end + lag_days
   - SS: successor.start = predecessor.start + lag_days
   - FF: successor.end = predecessor.end + lag_days (then calc start from duration)
   - SF: successor.end = predecessor.start + lag_days (then calc start from duration)
3. Update the dependent task's dates
4. Recursively process that task's dependents
5. Include cycle detection to prevent infinite loops

**Important:** This should be a database transaction - all updates succeed or all fail

### Circular Dependency Prevention

Before saving a new dependency, check that it won't create a cycle:
1. Build a graph of all dependencies
2. Use depth-first search from the proposed successor
3. If you can reach the proposed predecessor, it would create a cycle - reject the dependency

---

## Phase 5: React Component Architecture (DONE)

### New Components to Create

**GanttChart.tsx**
- Main wrapper component
- Initializes frappe-gantt instance
- Handles cleanup on unmount
- Props: projectId, tasks, onTaskUpdate, onTaskClick

**GanttWrapper.tsx**
- Data fetching layer using React Query or SWR
- Transforms API response to frappe-gantt format
- Handles loading and error states
- Passes data to GanttChart

**TaskDetailPanel.tsx** (or modify existing TaskFormModal)
- Slides in from right or displays as floating panel when task is clicked
- Shows full task details
- Allows editing all fields including dependencies
- Should be draggable and non-blocking (user can still see chart)

**DependencyEditor.tsx**
- Sub-component for managing dependencies within TaskDetailPanel
- Lists current dependencies with type and lag
- Add new dependency: dropdown to select predecessor task, type selector, lag input
- Delete existing dependencies
- Shows warning if dependency would create cycle

### Component Hierarchy

```
ProjectSchedulePage
├── GanttToolbar (zoom controls, view options, add task button)
├── GanttWrapper
│   └── GanttChart (frappe-gantt instance)
└── TaskDetailPanel (conditional, when task selected)
    ├── TaskBasicFields (name, description, dates, duration)
    ├── TaskAssignments (contractor, budget category)
    ├── TaskProgress (status, percent complete)
    └── DependencyEditor
```

---

## Phase 6: frappe-gantt Integration Details (DONE)

### Initialization

Create the Gantt instance in a useEffect, targeting a container div:
- Pass the tasks array
- Configure event handlers for on_click, on_date_change, on_progress_change
- Set view_mode (Day, Week, Month, Quarter)
- Set date_format

### Event Handling

**on_click(task)**
- Open the TaskDetailPanel with this task's data
- Set selected task state

**on_date_change(task, start, end)**
- Call the reschedule API endpoint
- Optimistically update local state
- API handles cascade to dependents
- Refetch full task list after API confirms (to get cascaded changes)

**on_progress_change(task, progress)**
- Call the progress update API endpoint
- Update local state

### Styling Customization

frappe-gantt allows custom classes per task. Use this for:
- Color-coding by budget category
- Visual distinction for milestones
- Highlighting overdue tasks (end_date < today && progress < 100)
- Highlighting tasks with issues

### View Options

Implement toolbar buttons to switch between:
- Day view (detailed, short timeframes)
- Week view (default, good balance)
- Month view (overview)
- Quarter view (high-level planning)

---

## Phase 7: Task Modal Redesign (DONE)

### Layout Changes

Make the modal/panel:
- Draggable by the header
- Non-modal (no backdrop blocking the chart)
- Wider aspect ratio (2-column layout inside)

### Two-Column Layout

**Left Column:**
- Task Name (required)
- Description (textarea)
- Contractor assignment (dropdown)
- Budget Category (dropdown)

**Right Column:**
- Start Date (date picker)
- Duration (number input, days)
- End Date (date picker, auto-calculated but editable)
- Status (dropdown)
- Progress % (number input or slider)

**Full-Width Section Below:**
- Dependencies section (DependencyEditor component)
- Shows table of current dependencies
- Add dependency row with: task selector, type selector (FS/FF/SS/SF), lag days input

### Duration ↔ Date Sync Logic

In the modal's local state:
- When user changes start_date: recalculate end_date = start_date + duration_days
- When user changes duration_days: recalculate end_date = start_date + duration_days
- When user changes end_date: recalculate duration_days = end_date - start_date

Use a flag to track which field the user is actively editing to avoid infinite update loops.

---

## Phase 8: Migration & Data Cleanup (DONE)

### One-Time Migration Script

1. Query all existing tasks that have predecessors (from current multi-select format)
2. For each predecessor relationship, insert a row into task_dependencies:
   - predecessor_task_id = the predecessor
   - successor_task_id = the task that has the predecessor
   - dependency_type = 'FS'
   - lag_days = 0
3. Calculate and set duration_days for all tasks: end_date - start_date
4. Set default progress = 0 for tasks without progress
5. Remove the old predecessors column/field from tasks table (or leave as deprecated)

### Validation Checks After Migration

- Every task has a valid duration_days
- No circular dependencies exist
- All dependency references point to valid task IDs within the same project

---

## Phase 9: Testing Checklist (DONE)

### Functional Tests

- [x] Gantt chart renders with existing tasks
- [x] Task bars show correct start/end positions
- [x] Dependency arrows display between connected tasks
- [x] Clicking a task opens the detail panel
- [x] Dragging a task bar updates its dates
- [x] Dragging a task bar triggers cascade to dependent tasks
- [x] Resizing a task bar (drag edge) changes duration
- [x] Progress bar inside task reflects progress percentage
- [x] Changing progress via drag updates the database
- [x] Adding a dependency shows new arrow
- [x] Removing a dependency removes the arrow
- [x] Circular dependency is prevented with error message
- [x] View mode switching works (Day/Week/Month/Quarter)
- [x] New task can be created from toolbar
- [x] Task detail panel is draggable
- [x] Task detail panel doesn't block chart interaction

### Edge Cases

- [x] Task with zero duration (milestone) displays correctly
- [x] Task with many dependencies (5+) renders arrows without visual mess
- [x] Very long project (100+ tasks) performs acceptably
- [x] Dates far in the future scroll correctly
- [x] Weekend/non-working day handling (if applicable)

---

## Phase 10: Future Enhancements (Out of Scope for Initial Implementation)

Document these for later but do not implement now:

- Critical path highlighting
- Resource leveling (avoid overallocating a contractor)
- Baseline comparison (planned vs actual)
- Export to PDF/PNG
- Import from MS Project
- Working days calendar (exclude weekends/holidays)
- Task grouping/summary tasks (WBS structure)
- Undo/redo for drag operations
