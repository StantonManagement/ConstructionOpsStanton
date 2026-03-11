# Consolidated Project Dashboard - ClickUp Task List (Tasks 11-24)

**Epic Priority:** CRITICAL (Dan's #1 Feature Request)
**Epic Effort:** 40-60 hours total
**Source:** Dan's Check-In Call + Detailed PRD
**Reference:** CONSOLIDATED_DASHBOARD_PRD.md
**Related:** TASKS_FROM_DAN_CHECKIN.md (Tasks 1-10)
**Date:** February 26, 2026

---

## Overview

Dan's quote: _"This is THE reason I want to use the app day-to-day. Without this, there's no reason to open it."_

Dan manages 10+ active construction projects and needs a single view showing all cross-project priorities, blockers, and capacity. Without this consolidated dashboard, critical follow-ups fall through the cracks when emergencies shift priorities throughout the day.

**Note:** This epic corresponds to **Task 5** from TASKS_FROM_DAN_CHECKIN.md but broken down into 14 implementation tasks (Tasks 11-24).

---

## Task 11: Data Migration - Purge Test Data & Load Real Projects

**Priority:** CRITICAL (Prerequisite)
**Effort:** 4-6 hours

### Problem
The app currently contains 100% test data with fake project names, budgets, and timelines. The consolidated dashboard will be useless without real project data. This must be completed before any dashboard development begins.

### Task
- [ ] Purge all test data from database tables:
  - Delete test projects, properties, tasks, contractors, budgets
  - Delete test payment applications and daily logs
  - Keep schema/structure, only remove data rows
- [ ] Coordinate with Dan to collect information for 10 real projects:
  - Studio at Weston
  - 31 Park
  - 213 Buckingham retaining wall
  - Unit turnovers (multiple units)
  - 90 Park emergency
  - 15 Whitmore emergency
  - Zach's house (New City)
  - 165 Westland
  - 10 Walkit
  - Park Portfolio Water Conservation
- [ ] For each project, collect: name, address, client, budget, dates, phase, assigned contractors
- [ ] Create SQL scripts or API calls to insert real project data
- [ ] Verify data accuracy with Dan
- [ ] Set up proper project numbering/coding system

---

## Task 12: Action Items - Database Schema & API

**Priority:** CRITICAL
**Effort:** 6-8 hours

### Problem
There's no data structure to track cross-project action items (call inspector, chase bid, unblock contractor). These management-layer items are different from construction tasks and need their own table with priority ranking, waiting-on tracking, and follow-up dates.

### Task
- [ ] Create `action_items` table in Supabase with fields:
  - `id`, `title`, `description`, `project_id` (FK to projects)
  - `priority` (1-5), `type` (emergency, blocker, waiting_on_external, etc.)
  - `status` (open, in_progress, waiting, resolved, deferred)
  - `assigned_to` (FK to users), `waiting_on` (text), `follow_up_date`
  - `source` (manual/auto), `auto_trigger` (for system-generated items)
  - `resolution_note`, `priority_changed_at`, `previous_priority`
  - `created_at`, `updated_at`
- [ ] Add indexes for performance: project_id, priority, status, follow_up_date
- [ ] Create API endpoints:
  - `GET /api/action-items` - fetch all with project data
  - `POST /api/action-items` - create new item
  - `PATCH /api/action-items/:id` - update priority, status, fields
  - `DELETE /api/action-items/:id` - soft delete (mark resolved)
- [ ] Create RLS policies for action items (avoid production bugs!)
- [ ] Test all CRUD operations work correctly

---

## Task 13: Priority List UI - Core Features

**Priority:** CRITICAL
**Effort:** 8-10 hours

### Problem
Dan needs to see all action items across all projects in one prioritized list. Current app has no cross-project view - you must drill into each project individually to see what needs attention. When emergencies arise, there's no way to quickly see what got deprioritized.

### Task
- [ ] Create dashboard page at `/dashboard` (or make it default `/` route)
- [ ] Fetch action items grouped by priority (1-5)
- [ ] Display priority groups with visual separation:
  - Priority 1: Red styling - "Drop Everything"
  - Priority 2: Orange styling - "Today / This Week"
  - Priority 3: Yellow styling - "Needs a Push"
  - Priority 4: Gray styling - "On the Radar"
  - Priority 5: Light gray styling - "Parked"
- [ ] Each action item card shows:
  - Priority badge (clickable for quick reprioritize)
  - Item title (truncate if long)
  - Project name tag
  - Type badge (emergency, blocker, waiting, etc.)
  - Status indicator
  - Overdue badge if past follow-up date
  - Auto-generated indicator (⚡) if system-created
- [ ] Click item to expand and show details:
  - Full description
  - Type, status, waiting on, follow-up date
  - Action buttons: Start, Resolve, Defer
- [ ] Show summary stats: X open · Y needs review · Z resolved
- [ ] Implement smooth animations and transitions

**Reference:** `/Users/zeff/Downloads/dashboard_mockup.jsx` lines 280-403

---

## Task 14: Priority List UI - Quick Add & Reprioritization

**Priority:** CRITICAL
**Effort:** 4-6 hours

### Problem
When the insurance inspector calls, Dan needs to add a new Priority 1 item and see it appear at the top of the list in under 5 seconds. Current workflow would require navigating to project, finding task section, creating item - far too slow for emergency triage.

### Task
- [ ] Create "Quick Add" button at top of priority list
- [ ] Quick add form with minimal fields:
  - Title (text input with autofocus)
  - Project (dropdown of active projects)
  - Priority (1-5 button picker)
  - Optional: Type, description (can be filled later)
- [ ] Submit adds item to list immediately (optimistic UI)
- [ ] Sync to backend in background
- [ ] **Tap-to-reprioritize:** Click priority badge opens inline picker
  - Show 1-5 options in popup
  - Select new priority → list reorders instantly
  - Track priority change history (previous_priority, priority_changed_at)
- [ ] Desktop: Drag-and-drop reorder within same priority tier (optional, nice-to-have)
- [ ] Mobile: Large touch targets (44x44px minimum) for construction site use
- [ ] Keyboard shortcuts: Enter to submit quick-add, Escape to cancel

**Reference:** `/Users/zeff/Downloads/dashboard_mockup.jsx` lines 230-277, 307-333

---

## Task 15: Project Health Cards

**Priority:** HIGH
**Effort:** 6-8 hours

### Problem
Dan can't answer "what's the overall status of 31 Park?" without drilling into the project. He needs a quick visual health signal showing which projects have urgent items, blockers, or are on track. Projects with emergencies should appear first.

### Task
- [ ] Create project health sidebar (right side on desktop, below list on mobile)
- [ ] Fetch all active projects with action item counts
- [ ] Calculate health signal for each project (derived logic, not manual):
  - **Red:** Has Priority 1 items OR blockers older than 3 days OR emergency flag
  - **Yellow:** Has Priority 2 items OR items past follow-up date OR completion behind pace
  - **Green:** No P1-2 items, no overdue items, on track
- [ ] Each project card shows:
  - Project name
  - Current phase (Planning, Demo, Rough-In, Finishing, Punch List, Complete)
  - Completion % with progress bar
  - Health color-coded left border (green/yellow/red)
  - Open action item count: "3 items (1 blocker)"
  - Highest priority badge if P1 or P2
- [ ] Sort projects by health (red first, then yellow, then green)
- [ ] Within same health tier, sort by open action item count (descending)
- [ ] Click project card navigates to existing project detail view
- [ ] Show "No active items" in gray for projects with 0 action items

**Reference:** `/Users/zeff/Downloads/dashboard_mockup.jsx` lines 449-499

---

## Task 16: Auto-Generated Action Items

**Priority:** HIGH
**Effort:** 8-10 hours

### Problem
System data already knows when tasks are blocked, bids are overdue, or verification is needed - but nobody is notified. These issues only surface when someone manually checks, causing delays. Auto-generating action items ensures critical issues don't fall through the cracks.

### Task
- [ ] Create background job or API endpoint to detect triggers and auto-create action items
- [ ] Implement 5 auto-generation rules:
  1. **Task blocked 2+ days** → Create Priority 3 blocker item
     - Query tasks with `blocked=true` and `blocked_date < NOW() - 2 days`
     - Create: "Blocker: {task_name} at {project_name} — {block_reason} for {N} days"
  2. **Bid responses due today/tomorrow** → Create Priority 2 waiting item
     - Query bid rounds with `due_date IN (today, tomorrow)` and status=open
     - Create: "Bid responses due: {scope} at {project_name}"
  3. **Bid round with 0 responses 2 days past due** → Create Priority 2 follow-up
     - Query bid rounds with `due_date < NOW() - 2 days` and `response_count = 0`
     - Create: "No bid responses: {scope} — follow up or extend deadline"
  4. **Work marked complete, not verified 3+ days** → Create Priority 3 verification item
     - Query tasks with `status=completed_by_worker` and `verified_by_pm=false` and `completed_date < NOW() - 3 days`
     - Create: "Verification needed: {task_name} at {location}"
  5. **Scheduled task start date passed, no status change** → Create Priority 3 item
     - Query tasks with `scheduled_start < NOW()` and `status=not_started`
     - Create: "Not started: {task_name} at {project_name} — was scheduled {date}"
- [ ] Tag auto-generated items with `source='auto'` and `auto_trigger` type
- [ ] Add visual indicator (⚡ icon) to distinguish from manual items
- [ ] Allow Dan to dismiss, reprioritize, or resolve auto-generated items
- [ ] Prevent duplicate auto-items (check if already exists before creating)
- [ ] Run auto-generation every hour (cron job or scheduled function)

---

## Task 17: Bumped Item Detection ("Needs Review")

**Priority:** HIGH
**Effort:** 4-6 hours

### Problem
When Priority 2 item gets knocked down to Priority 4 due to an emergency, it can sit untouched for days while everyone focuses on the crisis. These "bumped" items never get resolved - they just disappear from attention. Dan needs to be reminded: "You deprioritized this 3 days ago - is it still parked or does it need attention?"

### Task
- [ ] Track priority change history:
  - When priority changes, save `previous_priority` and `priority_changed_at`
  - Track `updated_at` for any meaningful change (status, notes, resolution)
- [ ] Detect stale bumped items (run hourly):
  - Query action items where:
    - `priority > previous_priority` (was decreased)
    - `updated_at < NOW() - 3 days` (no updates for 3+ days)
    - `status != resolved`
  - Mark these items with `stale=true` flag
- [ ] Create "Needs Review" section below priority list
  - Show yellow/amber warning styling
  - Display: "{title} — Was Priority {prev} → moved to {current} · no updates for {N} days"
  - Show days since bump: "5d" badge
- [ ] Provide actions for stale items:
  - "Restore to P{previous_priority}" button - one click to undo deprioritization
  - "Dismiss" button - marks stale=false (Dan acknowledges it's intentionally parked)
  - "Resolve" button - mark as resolved with note
- [ ] Clicking stale item expands to show full details
- [ ] Make stale detection threshold configurable (default: 3 days)

**Reference:** `/Users/zeff/Downloads/dashboard_mockup.jsx` lines 404-446

---

## Task 18: Capacity View

**Priority:** MEDIUM
**Effort:** 6-8 hours

### Problem
Dan can't answer "do we have capacity to take on a new project?" or "which crews are tied up where?" without manually reviewing every active project. He needs a quick capacity snapshot showing active work by phase and contractor utilization.

### Task
- [ ] Create "Capacity Snapshot" widget below project health cards
- [ ] Calculate and display 4 key metrics:
  1. **Active Projects** - Count of projects not in "Complete" phase
  2. **Emergencies** - Count of projects with type=emergency
  3. **Open Blockers** - Count of action items with type=blocker and status≠resolved
  4. **Waiting Items** - Count of action items with status=waiting
- [ ] Create "Active Projects by Phase" breakdown (optional, Phase 2):
  - Group active projects by phase: Planning, Demo, Rough-In, Finishing, Punch List
  - Show count in each phase
  - Visual bar chart or simple count list
- [ ] Create "Contractor Utilization" view (optional, Phase 2):
  - Query project_contractors for active assignments
  - Show which contractors are on how many active projects
  - Highlight contractors on 3+ projects (potentially overloaded)
- [ ] Create "Starting Soon" timeline (optional, Phase 2):
  - Query tasks/projects with `scheduled_start BETWEEN NOW() AND NOW() + 14 days`
  - Show what's scheduled to start in next 2 weeks
  - Group by week
- [ ] Make capacity view collapsible on mobile to save space

**Reference:** `/Users/zeff/Downloads/dashboard_mockup.jsx` lines 501-519

---

## Task 19: Filters & Search ✅

**Priority:** MEDIUM
**Effort:** 4-6 hours
**Status:** COMPLETED (March 11, 2026)
**Documentation:** `docs/TASK_19_FILTERS_AND_SEARCH.md`

### Problem
Default unified priority list is useful, but sometimes Dan needs to focus on one project's action items, or see only blockers, or filter to crisis mode (P1-2 only). Without filters, the list becomes overwhelming with 50+ items across 10 projects.

### Task
- [x] Add filter bar above priority list with 5 filter options:
  1. **By Project** - Dropdown of all active projects + "All Projects" ✅
  2. **By Type** - Dropdown of item types (emergency, blocker, waiting, etc.) + "All Types" ✅
  3. **By Priority** - Dropdown: All, P1-2 only (crisis mode), P3-5 (backlog) ✅
  4. **By Status** - Dropdown: All, Open, In Progress, Waiting, Resolved, Deferred ✅
  5. **By Assignee** - Dropdown of team members (if multiple people use system) ⏸️ (awaiting user assignment feature)
- [x] Apply filters to priority list in real-time
- [x] Update URL query params when filters change (shareable/bookmarkable)
- [x] Show "Clear all filters" button when any filter is active
- [x] Show filter count: "Showing 8 of 43 items" when filters active
- [x] Filters apply to both active list and "Needs Review" section
- [x] Preserve filters when navigating back from project detail (via URL params)
- [x] Mobile: Stack filters vertically, make dropdowns full-width

**Implementation Highlights:**
- All 4 active filters (Project, Type, Priority, Status) with URL sync
- Special priority modes: "P1-2 (Crisis Mode)" and "P3-5 (Backlog)"
- Smart filter count showing "X of Y items" when filtered
- Mobile-responsive with `flex-col` stacking on small screens
- Filters apply to both active items and stale "Needs Review" items
- Clean, consistent UI integrated with existing design

**Reference:** `/Users/zeff/Downloads/dashboard_mockup.jsx` lines 200-222

---

## Task 20: Resolve Action Items & History

**Priority:** MEDIUM
**Effort:** 3-4 hours

### Problem
When action items are resolved, they should disappear from the active list but remain searchable for audit trail and pattern recognition. Dan needs to see "what did we resolve last week?" and "how did we handle the last emergency repair?"

### Task
- [ ] Add "Resolve" button to expanded action item view
- [ ] When clicked, show resolution note input field
- [ ] Submit marks item as `status=resolved` and saves `resolution_note`
- [ ] Resolved items removed from active priority list
- [ ] Create "Resolved Items" view (separate tab or filtered view):
  - Show all resolved items in reverse chronological order
  - Display: title, project, priority, resolution note, resolved date
  - Allow search by title or project
  - Group by week: "This Week", "Last Week", "Older"
- [ ] Show resolved count in filter bar: "43 open · 5 needs review · 127 resolved"
- [ ] Clicking resolved item shows full history:
  - Created date, priority changes, status changes
  - Who created, who resolved
  - Time to resolution
- [ ] Allow re-opening resolved items (change status back to open)

---

## Task 21: Initial Action Items Seeding

**Priority:** CRITICAL (Prerequisite)
**Effort:** 2-3 hours

### Problem
The dashboard will be empty on launch without initial action items. Dan needs to do a one-time brain dump of everything currently active, waiting, or blocked across his 10 projects to establish the starting state.

### Task
- [ ] Schedule 60-minute session with Dan for action item brain dump
- [ ] For each of Dan's 10 active projects, capture:
  - What needs immediate attention (Priority 1-2)
  - What's actively being worked on (Priority 3)
  - What's on the radar but not urgent (Priority 4-5)
  - What he's waiting on (inspector, bid, contractor, permits)
  - What's blocked or overdue
- [ ] Document 20-30 initial action items with:
  - Title, project, priority, type, status
  - Waiting on (if applicable), follow-up date
- [ ] Create SQL script or API calls to seed these items
- [ ] Run seeding after database schema is created
- [ ] Review seeded data with Dan to verify accuracy
- [ ] This becomes the baseline for future auto-generated items

---

## Task 22: Mobile Optimization & Polish

**Priority:** MEDIUM
**Effort:** 4-6 hours

### Problem
Dan is often on construction sites, not at a desk. The dashboard must work well on mobile with large touch targets, readable text, and smooth performance. Current desktop-first design won't translate well to small screens.

### Task
- [ ] Implement responsive layout:
  - Desktop: Priority list (60%) + project health (40%) side-by-side
  - Mobile: Stack vertically, priority list on top
  - Tablet: Adaptive based on available width
- [ ] Add mobile view toggle (optional):
  - Switch between "Priority List" and "Projects" tabs
  - Saves screen space on small devices
- [ ] Optimize touch targets:
  - Priority badges: Minimum 44x44px (Apple HIG standard)
  - Action buttons: 48x48px for construction site use with gloves
  - Adequate spacing between clickable elements (8-12px)
- [ ] Simplify mobile UI:
  - Hide less critical info (auto-generated indicator, exact dates)
  - Show only essential data on collapsed cards
  - Use icons instead of text where possible
- [ ] Test on real devices:
  - iPhone (Safari)
  - Android (Chrome)
  - iPad (Safari)
- [ ] Performance optimization:
  - Lazy load project health cards
  - Virtual scrolling for 50+ action items
  - Optimize images/icons
  - Target <2 second load time on 4G connection
- [ ] Add pull-to-refresh on mobile (native feel)
- [ ] Consider PWA installability (optional, future enhancement)

---

## Task 23: Notifications Integration

**Priority:** MEDIUM
**Effort:** 3-4 hours

### Problem
When action items are assigned or become overdue, the assigned person should be notified. The existing SMS notification system (from Task 1) should be extended to support action item events.

### Task
- [ ] Extend existing notification service (src/lib/notificationService.ts) with new templates:
  - `action_item_assigned` - "You've been assigned: {title} at {project} — Priority {priority}"
  - `action_item_overdue` - "{title} at {project} is overdue (follow-up was {date})"
  - `action_item_escalated` - "{title} priority increased to {new_priority}"
- [ ] Send SMS when:
  - Action item assigned to contractor/PM (if assigned_to is set and user has phone)
  - Action item becomes overdue (follow_up_date < today and still open)
  - Priority escalated from 3+ to 1-2
- [ ] Add email notifications (optional):
  - Daily digest of P1-2 items every morning at 7am
  - Weekly summary of resolved items
- [ ] Add in-app notifications (optional, future):
  - Bell icon in nav bar
  - Show unread count
  - List recent activity
- [ ] Make notifications configurable per user:
  - User settings for SMS on/off
  - Email digest frequency (daily, weekly, off)
  - Which events trigger notifications

---

##  

**Priority:** CRITICAL
**Effort:** 4-6 hours

### Problem
The consolidated dashboard is the most complex feature in the app with many moving parts (priority changes, auto-generation, bumped detection, health signals). Without thorough testing, bugs will break Dan's core workflow and erode trust in the system.

### Task
- [ ] **Manual testing scenarios:**
  1. Create action item via quick-add, verify it appears instantly
  2. Change priority, verify list reorders correctly
  3. Mark item in-progress, waiting, resolved - verify status changes
  4. Deprioritize item (2→4), wait for stale detection (use test dates), verify "Needs Review" appears
  5. Create blocked task, verify auto-generated action item created
  6. Create bid round due tomorrow, verify auto-generated item created
  7. Filter by project, type, priority - verify correct items shown
  8. Resolve item with note, verify it disappears and appears in resolved view
  9. Verify project health changes when P1 item added/resolved
  10. Test on mobile device (iPhone/Android) - all interactions work
- [ ] **Load testing:**
  - Test with 100 action items across 20 projects
  - Verify dashboard loads in <2 seconds
  - Verify priority changes are instant
  - Check for memory leaks on long-running sessions
- [ ] **RLS policy testing:**
  - Verify users can only see action items for projects they have access to
  - Verify contractors can see items assigned to them
  - Verify PMs can see all items for their projects
- [ ] **Edge cases:**
  - Action item with no project assigned
  - Action item with deleted project
  - Multiple priority changes in quick succession
  - Auto-generated item for already-resolved issue
  - Bumped item that was already dismissed
- [ ] **Accessibility:**
  - Keyboard navigation (tab through items, enter to expand)
  - Screen reader compatibility (ARIA labels)
  - Color contrast (WCAG AA minimum)
- [ ] Document any bugs found and fix before deployment

---

## Dependencies & Order of Execution

### Must Complete First (Blocking):
1. **Task 1 from TASKS_FROM_DAN_CHECKIN.md:** Fix RLS Bug - Cannot Create Projects
2. **Task 2 from TASKS_FROM_DAN_CHECKIN.md:** Fix RLS Bug - Cannot Assign Contractors

### Recommended Build Order:
1. ✅ Task 11: Data Migration (load real projects first)
2. ✅ Task 12: Database Schema & API (foundation for everything else)
3. ✅ Task 21: Initial Action Items Seeding (establish baseline data)
4. ✅ Task 13: Priority List UI - Core Features (main interface)
5. ✅ Task 14: Quick Add & Reprioritization (core interaction)
6. ✅ Task 15: Project Health Cards (visual summary)
7. ✅ Task 16: Auto-Generated Action Items (intelligence layer)
8. ✅ Task 17: Stale Item Detection (intelligence layer)
9. ✅ Task 18: Quick Filters (additional insights)
10. ✅ Task 19: Filters & Search (power user features)
11. ⏭️ Task 20: Resolve & History (audit trail)
12. ⏭️ Task 23: Notifications Integration (user engagement)
13. ⏭️ Task 22: Mobile Optimization (polish)
14. ⏭️ Task 24: Testing & QA (before deployment)

---

## Total Estimated Effort

| Phase | Tasks | Hours |
|-------|-------|-------|
| **Foundation** (must ship together) | 11, 12, 13, 14, 15, 21 | 30-42 hours |
| **Intelligence** | 16, 17 | 12-16 hours |
| **Enhancement** | 18, 19, 20, 23 | 16-24 hours |
| **Polish & QA** | 22, 24 | 8-12 hours |
| **Total** | 14 tasks (11-24) | **66-94 hours** |

**Note:** Original estimate was 40-60 hours. With all enhancements and polish included, total is 66-94 hours. To hit original estimate, ship Foundation phase first (30-42 hrs), then iterate on Intelligence and Enhancement in subsequent releases.

---

## Success Metrics

After deployment, measure:

1. **Daily active usage:** Does Dan open the app every morning?
2. **Priority changes per day:** How often is the list being actively managed?
3. **Items resolved per week:** Is the system helping clear blockers?
4. **Stale item rate:** What % of bumped items get re-escalated vs. dismissed?
5. **Auto-generated item accuracy:** Are auto-items useful or just noise?
6. **Time to resolution:** How long do Priority 1-2 items take to resolve?
7. **Mobile usage %:** What % of interactions happen on phone vs. desktop?

**Target:** Dan uses dashboard daily within 1 week of launch, resolves 10+ items per week.

---

## Reference Documents

- **Full PRD:** `CONSOLIDATED_DASHBOARD_PRD.md` (complete technical specification)
- **UI Mockup:** `/Users/zeff/Downloads/dashboard_mockup.jsx` (fully functional React prototype)
- **Related Tasks:** `TASKS_FROM_DAN_CHECKIN.md` - Tasks 5, 6 (Load Real Data)
- **Notification Service:** `src/lib/notificationService.ts` (extend for action item events)
