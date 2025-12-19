# Gantt Chart Standards & Best Practices

**Date:** December 17, 2025  
**Purpose:** Document proper Gantt chart display standards and compare with current implementation

---

## 📊 Standard Gantt Chart Elements

### Essential Visual Components

1. **Timeline Header**
   - Clear date labels (days, weeks, months, quarters, years)
   - Current date indicator ("Today" line)
   - Hierarchical time scales (e.g., months above weeks)

2. **Task Bars**
   - Horizontal bars representing task duration
   - Start and end dates clearly visible
   - Task name displayed on or near the bar
   - Color coding by status, category, or resource

3. **Progress Indicators**
   - Visual representation of completion percentage
   - Often shown as filled portion within task bar
   - Percentage label (e.g., "45%")

4. **Dependencies (Critical)**
   - Arrow lines connecting related tasks
   - Types: Finish-to-Start (FS), Start-to-Start (SS), Finish-to-Finish (FF), Start-to-Finish (SF)
   - Lag time indicators if applicable

5. **Milestones**
   - Diamond or marker shape (not bars)
   - Zero duration
   - Significant project events

6. **Critical Path** (Advanced)
   - Highlighted tasks that determine project completion date
   - Usually shown in red or bold

7. **Task List Panel**
   - Left side panel showing task hierarchy
   - Task names, IDs, durations
   - Expand/collapse for subtasks

---

## 🎨 Visual Design Standards

### Color Coding
- **Status-based:**
  - Not Started: Light gray
  - In Progress: Blue
  - Completed: Green
  - Overdue: Red
  - On Hold: Yellow/Orange

- **Category-based:**
  - Budget-linked tasks: Green tint
  - Different phases: Different color families
  - Critical path: Red/Bold

### Typography
- Task names: 12-14px, readable font
- Date labels: 10-12px
- Headers: 14-16px, bold

### Spacing
- Adequate row height (30-40px minimum)
- Clear separation between tasks
- Proper padding in task bars

---

## ✅ Current Implementation Status

### ✅ Implemented Features

1. **Library:** Using `gantt-task-react` (modern React Gantt library)
2. **View Modes:** Day, Week, Month, Year
3. **Task Bars:** Displayed with proper start/end dates
4. **Dependencies:** Visual arrows showing task relationships
5. **Progress Bars:** Shown inside task bars
6. **Drag-to-Reschedule:** Interactive date changes
7. **Tooltips:** Hover information with task details
8. **Budget Linking:** Visual indicator (💲) for budget-linked tasks
9. **Color Coding:** Green for budget-linked, blue for standard tasks
10. **Task List Panel:** Left sidebar with task names (155px width)

### ⚠️ Missing/Needs Improvement

1. **Milestones Display**
   - ✅ Backend supports `is_milestone` flag
   - ❌ Not visually distinct (should be diamond, not bar)
   - Need to set `type: 'milestone'` in Gantt task conversion

2. **Critical Path**
   - ❌ Not calculated or displayed
   - Would require graph analysis of dependencies
   - Low priority for construction projects

3. **Task Hierarchy/Grouping**
   - ❌ No parent-child task relationships displayed
   - ❌ No expand/collapse functionality
   - Backend has `parent_task_id` but not utilized in UI

4. **Resource Allocation**
   - ❌ No visual indication of contractor assignments on bars
   - ❌ No resource overallocation warnings

5. **Baseline Comparison**
   - ❌ No planned vs actual timeline comparison
   - Would require storing original schedule

6. **Working Days Calendar**
   - ❌ No weekend/holiday exclusions
   - All days treated as working days

7. **Status Indicators**
   - ⚠️ Limited status-based color coding
   - Only budget-linked vs standard distinction
   - Should add overdue highlighting

---

## 🎯 Recommended Improvements

### Priority 1 (High Impact, Achievable)

1. **Fix Milestone Display**
   ```typescript
   // In GanttChartContainer.tsx
   const ganttTasks: Task[] = tasks.map(t => {
     return {
       // ...
       type: t.is_milestone ? 'milestone' : 'task',
       // ...
     };
   });
   ```

2. **Add Overdue Highlighting**
   ```typescript
   const isOverdue = new Date(t.end_date) < new Date() && t.progress < 100;
   styles: { 
     progressColor: isOverdue ? '#DC2626' : (isBudgetLinked ? '#059669' : '#3B82F6'),
     backgroundColor: isOverdue ? '#FEE2E2' : (isBudgetLinked ? '#D1FAE5' : undefined)
   }
   ```

3. **Improve Task Bar Labels**
   - Show task name on bar (if space permits)
   - Show duration in tooltip
   - Show contractor name in tooltip

4. **Better Column Width Scaling**
   - Current: Fixed widths per view mode
   - Better: Responsive based on date range and screen size

### Priority 2 (Nice to Have)

5. **Task Grouping by Phase**
   - Group tasks by `current_phase` or custom field
   - Visual separators between groups

6. **Status-Based Filtering**
   - Filter tasks by status (show/hide completed)
   - Filter by contractor
   - Filter by budget category

7. **Print/Export View**
   - Clean print stylesheet
   - Export to PNG/PDF
   - Export to Excel/CSV

### Priority 3 (Advanced Features)

8. **Critical Path Calculation**
   - Identify longest dependency chain
   - Highlight in red
   - Show total project duration

9. **Resource Leveling**
   - Detect contractor overallocation
   - Visual warnings
   - Suggest schedule adjustments

10. **Baseline Tracking**
    - Store original schedule
    - Show variance from baseline
    - Slippage indicators

---

## 📐 Industry Standards Reference

### Construction-Specific Considerations

1. **Weather Days**
   - Construction projects need weather delay tracking
   - Consider adding "buffer days" field

2. **Permit Dependencies**
   - Tasks often depend on permit approvals
   - Consider special milestone type for permits

3. **Material Lead Times**
   - Long-lead items affect schedule
   - Consider "procurement" task type

4. **Inspection Points**
   - Mandatory inspection milestones
   - Should block dependent work

5. **Phasing**
   - Multi-phase projects common in construction
   - Need clear phase boundaries

---

## 🔧 Quick Wins for Better UX

### Immediate Improvements (< 1 hour each)

1. **Add "Today" Line**
   - Vertical line showing current date
   - Already supported by `gantt-task-react`
   - Just needs to be enabled

2. **Task Count Display**
   - Show "X tasks" in toolbar
   - Show "X overdue" if any

3. **Zoom to Fit**
   - Button to auto-zoom to show all tasks
   - Calculate date range from task dates

4. **Keyboard Shortcuts**
   - Arrow keys to navigate tasks
   - Delete key to remove task
   - Esc to close modal

5. **Loading State**
   - Show skeleton/spinner while loading
   - Currently shows empty state immediately

---

## 📊 Comparison: Previous vs Current

### Previous Implementation (Frappe-Gantt)
- ✅ Lightweight
- ✅ Drag-to-reschedule
- ✅ Dependencies
- ❌ Limited React integration
- ❌ Styling challenges
- ❌ Limited customization

### Current Implementation (gantt-task-react)
- ✅ Native React component
- ✅ TypeScript support
- ✅ Better performance
- ✅ More view modes
- ✅ Easier customization
- ✅ Active maintenance
- ⚠️ Need to fully utilize features

---

## 🎨 Visual Design Mockup Needs

### What We Should Have

```
┌─────────────────────────────────────────────────────────────────┐
│ Project Schedule    [Gantt] [List]    [Day▼Week▼Month▼Year]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Task List          │  Jan  │  Feb  │  Mar  │  Apr  │  May  │    │
│ ─────────────────  │───────│───────│───────│───────│───────│    │
│ Foundation         │████████│       │       │       │       │    │
│ Framing            │       │████████████│   │       │       │    │
│ ◆ Inspection       │       │   ◆   │       │       │       │    │
│ Electrical         │       │       │████████│       │       │    │
│ Plumbing           │       │       │████████│       │       │    │
│                    │       │   ↓   │   ↓   │       │       │    │
│                    │       │   TODAY        │       │       │    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Visual Elements
- ✅ Task bars with proper length
- ✅ Dependency arrows
- ⚠️ Milestones as diamonds (not implemented)
- ⚠️ Today line (not visible)
- ✅ Timeline header
- ✅ Task list panel

---

## 📝 Action Items

### Immediate (This Session)
1. ✅ Add Year view mode
2. ⬜ Fix milestone display (type: 'milestone')
3. ⬜ Add overdue highlighting
4. ⬜ Improve tooltip content

### Short Term (Next Session)
1. ⬜ Add task grouping by phase
2. ⬜ Add status-based filtering
3. ⬜ Improve column width calculations
4. ⬜ Add keyboard shortcuts

### Long Term (Future)
1. ⬜ Critical path calculation
2. ⬜ Resource leveling
3. ⬜ Baseline tracking
4. ⬜ Export functionality

---

## 📚 Resources

### Gantt Chart Standards
- **PMBOK Guide:** Project Management Body of Knowledge
- **CPM (Critical Path Method):** Standard scheduling technique
- **PERT Charts:** Related to Gantt but different focus

### Construction Scheduling
- **AIA Documents:** Industry standard forms
- **CSI MasterFormat:** Construction specification organization
- **Primavera P6:** Industry-standard software (reference for features)
- **Microsoft Project:** Common tool (reference for UX patterns)

### Libraries & Tools
- **gantt-task-react:** Current library (https://github.com/MaTeMaTuK/gantt-task-react)
- **frappe-gantt:** Previous library (simpler, vanilla JS)
- **dhtmlx-gantt:** Enterprise option (feature-rich but paid)
- **bryntum-gantt:** High-end option (very expensive)

---

**Last Updated:** December 17, 2025  
**Next Review:** After implementing Priority 1 improvements
