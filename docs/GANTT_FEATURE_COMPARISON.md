# Gantt Chart Feature Comparison: Old vs Current System

**Date:** December 17, 2025  
**Status:** Feature Gap Analysis

---

## 📊 Old System Features (Frappe-Gantt Based)

### ✅ What the Old System Had

#### 1. **Multiple View Modes**
- Quarter Day
- Half Day  
- Day
- Week (Default)
- Month

**Current Status:** ⚠️ Partially implemented (Day, Week, Month, Year - missing Quarter/Half day)

#### 2. **Auto-Scheduling / Cascade System**
- **Recursive dependency updates**
- **Finish-to-Start (FS) relationships**
- **Lag days support**
- **Duration preservation**
- **Cycle detection**
- **Automatic date recalculation**

**Current Status:** ❌ Missing - No cascade implementation found

#### 3. **Dependency Management**
- **Drag-to-create dependencies** (drag from task end to task start)
- **Form-based dependency editor**
- **Multiple dependency types:**
  - Finish-to-Start (FS)
  - Start-to-Start (SS)
  - Finish-to-Finish (FF)
  - Start-to-Finish (SF)
- **Lag days configuration**

**Current Status:** ⚠️ Partially implemented (API exists, UI missing drag-to-create)

#### 4. **Task Manipulation**
- **Drag entire task** to reschedule (preserves duration)
- **Resize task edges** to change duration
- **Auto-sync duration ↔ dates**
- **Milestone support** (0-day duration)

**Current Status:** ⚠️ Partially implemented (drag works, resize unclear)

#### 5. **Navigation**
- **Horizontal scrolling**
- **Click-and-drag panning**
- **"Today" button** to center on current date

**Current Status:** ⚠️ Partially implemented (scrolling works, Today button missing)

#### 6. **Data Architecture**
- `schedule_tasks` table with duration_days
- `schedule_dependencies` table (or `task_dependencies`)
- Cascade logic in `cascade.ts`
- Update endpoint with cascade trigger

**Current Status:** ⚠️ Partially implemented (tables exist, cascade.ts missing)

---

## 🔍 Current System Status

### What We Have Now

#### ✅ Working Features
1. **Basic Gantt display** using `gantt-task-react`
2. **View modes:** Day, Week, Month, Year
3. **Task list panel** on left side
4. **Tooltips** with task details
5. **Milestone display** as diamonds
6. **Overdue highlighting** in red
7. **Budget linking** indicators
8. **Task dependencies** (visual arrows)
9. **Database tables:**
   - `schedule_tasks`
   - `task_dependencies` (just created)
   - `schedule_defaults` (just created)
   - `project_schedules`

#### ❌ Missing Features
1. **Cascade/Auto-scheduling logic**
2. **Drag-to-create dependencies**
3. **Lag days UI**
4. **Multiple dependency types** (SS, FF, SF)
5. **Today button**
6. **Quarter/Half day views**
7. **Task resize to change duration**
8. **Automatic date recalculation on dependency changes**
9. **Cycle detection**
10. **`cascade.ts` implementation**

---

## 🚨 Critical Missing Components

### 1. Cascade Logic (`cascade.ts`)

**Old System Had:**
```typescript
// src/lib/scheduling/cascade.ts
export async function cascadeTaskUpdates(
  taskId: string,
  newEndDate: Date,
  supabase: SupabaseClient
) {
  // 1. Find all dependent tasks (successors)
  // 2. Calculate new start dates based on dependency type + lag
  // 3. Preserve duration, recalculate end date
  // 4. Recursively update successors
  // 5. Detect cycles to prevent infinite loops
}
```

**Current System:** ❌ File doesn't exist

### 2. Update Endpoint with Cascade

**Old System Had:**
```typescript
// src/app/api/schedules/tasks/[taskId]/update-dates/route.ts
export async function PUT(request: Request) {
  // 1. Update the task dates
  // 2. Call cascadeTaskUpdates()
  // 3. Return all affected tasks
}
```

**Current System:** ⚠️ Endpoint exists but doesn't call cascade

### 3. Dependency Creation UI

**Old System Had:**
- Drag circles from task ends
- Visual feedback during drag
- Automatic dependency creation

**Current System:** ❌ Only form-based, no drag-to-create

---

## 📋 Feature Restoration Priority

### Priority 1: Critical for Auto-Schedule
1. ✅ `schedule_defaults` table - **DONE**
2. ✅ `task_dependencies` table - **DONE**
3. ❌ Fix auto-schedule API error
4. ❌ Verify property_budgets view exists
5. ❌ Test auto-schedule with real project

### Priority 2: Cascade System
1. ❌ Create `src/lib/scheduling/cascade.ts`
2. ❌ Implement recursive dependency updates
3. ❌ Add cycle detection
4. ❌ Integrate with task update endpoint
5. ❌ Test cascade with multiple dependencies

### Priority 3: Enhanced UI
1. ❌ Add "Today" button to toolbar
2. ❌ Implement drag-to-create dependencies
3. ❌ Add lag days editor
4. ❌ Support multiple dependency types (SS, FF, SF)
5. ❌ Add task resize handles
6. ❌ Add Quarter/Half day views

### Priority 4: Polish
1. ⚠️ Improve error messages
2. ⚠️ Add loading states
3. ⚠️ Add undo/redo
4. ⚠️ Add keyboard shortcuts
5. ⚠️ Add export functionality

---

## 🔧 Immediate Action Items

### 1. Fix Auto-Schedule (In Progress)
- ✅ Created `schedule_defaults` table
- ✅ Created `task_dependencies` table  
- ❌ Debug why auto-schedule still fails
- ❌ Check server logs for actual error
- ❌ Verify property_budgets exists

### 2. Restore Cascade System
```typescript
// Need to create: src/lib/scheduling/cascade.ts
// Need to update: src/app/api/schedules/[id]/tasks/[taskId]/route.ts
```

### 3. Verify Dependencies Work
- Check if dependency arrows display
- Check if TaskFormModal has dependency editor
- Test creating dependencies via form
- Test that dependencies persist

---

## 📊 Comparison Table

| Feature | Old System | Current System | Status |
|---------|-----------|----------------|--------|
| Basic Gantt Display | ✅ frappe-gantt | ✅ gantt-task-react | ✅ Working |
| View Modes | 5 modes | 4 modes | ⚠️ Partial |
| Auto-Schedule | ✅ Full | ❌ Broken | 🔴 Critical |
| Cascade Updates | ✅ Full | ❌ Missing | 🔴 Critical |
| Dependency Types | ✅ 4 types | ⚠️ FS only | ⚠️ Partial |
| Drag Dependencies | ✅ Yes | ❌ No | 🔴 Missing |
| Lag Days | ✅ Yes | ⚠️ DB only | ⚠️ Partial |
| Cycle Detection | ✅ Yes | ❌ No | 🔴 Missing |
| Task Drag | ✅ Yes | ✅ Yes | ✅ Working |
| Task Resize | ✅ Yes | ❓ Unknown | ⚠️ Check |
| Today Button | ✅ Yes | ❌ No | 🟡 Minor |
| Milestones | ✅ Yes | ✅ Yes | ✅ Working |
| Tooltips | ✅ Basic | ✅ Enhanced | ✅ Better |
| Overdue Highlight | ❓ Unknown | ✅ Yes | ✅ Better |

---

## 🎯 Success Criteria

### Auto-Schedule Working
- ✅ Tables exist
- ✅ Data populated
- ❌ API returns success
- ❌ Tasks created/updated
- ❌ Dates calculated correctly

### Cascade Working
- ❌ Moving Task A updates Task B
- ❌ Task B updates Task C (recursive)
- ❌ Duration preserved
- ❌ Cycles detected and prevented
- ❌ All dependency types supported

### Full Feature Parity
- ❌ All old features restored
- ❌ No regressions
- ❌ Better performance
- ❌ Better UX
- ❌ Better error handling

---

## 📝 Notes

**Why the regression?**
- Switched from frappe-gantt to gantt-task-react
- Lost custom cascade logic in the migration
- Focused on UI improvements, missed backend logic
- Database tables created but cascade.ts never implemented

**What's better in new system?**
- ✅ Better TypeScript types
- ✅ Better React integration
- ✅ Enhanced tooltips
- ✅ Overdue highlighting
- ✅ Budget linking
- ✅ Year view

**What needs urgent attention?**
1. 🔴 Fix auto-schedule API
2. 🔴 Implement cascade.ts
3. 🔴 Test with real project data
4. 🟡 Restore drag-to-create dependencies
5. 🟡 Add Today button

---

**Next Steps:**
1. Debug auto-schedule error (check server logs)
2. Create cascade.ts with full logic
3. Update task update endpoint to call cascade
4. Test cascade with multiple dependencies
5. Add drag-to-create dependencies UI
6. Add Today button to toolbar
7. Test full workflow end-to-end
