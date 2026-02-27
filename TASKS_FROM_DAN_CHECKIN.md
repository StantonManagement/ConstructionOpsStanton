# Dan's Check-In Call - Task List

**Date:** February 26, 2026
**Source:** Live demo and check-in call with Dan
**Context:** Multiple critical bugs discovered during live demo. Production app is currently broken for core workflows.

---

## Task 1: Fix User/RLS Bug - Cannot Create Projects
**Priority:** CRITICAL
**Effort:** 2-4 hours

### Problem
During live demo with Dan, attempting to create a new project threw a user/RLS (Row Level Security) error. This was introduced by user/RLS changes that were pushed directly to production the night before the call. The error completely blocks the ability to create new projects, making this core functionality unusable.

### Task
- Debug and identify the specific RLS policy causing the error
- Fix RLS policies to allow authenticated users to insert into projects table
- Test project creation flow end-to-end
- Verify error logs are clean
- Deploy fix through proper staging process (not directly to prod)

---

## Task 2: Fix User/RLS Bug - Cannot Assign Contractors to Budget Lines
**Priority:** CRITICAL
**Effort:** 2-4 hours

### Problem
During the live demo, Dan attempted to assign a contractor to a budget line item and received a user/RLS error. This is part of the same RLS issue that broke project creation. Without the ability to assign contractors to budget lines, the entire project setup workflow is blocked. You can create the project structure but cannot assign who will do the work.

### Task
- Debug and identify the specific RLS policy blocking contractor assignments
- Fix RLS policies for project_contractors or budget_line_items tables
- Test contractor assignment flow end-to-end
- Verify both initial assignment and updates work
- Deploy fix through proper staging process

---

## Task 3: Fix Modal Dismiss Behavior
**Priority:** HIGH
**Effort:** 1-2 hours

### Problem
When users click "New Project" (or any form modal), a modal opens with input fields. If the user accidentally clicks anywhere outside the modal boundaries, the modal closes immediately and all their input is lost. This creates a frustrating user experience, especially when filling out lengthy forms. Dan specifically mentioned this as a UX issue during the call.

### Task
- Update all modal components to disable "click outside to dismiss" behavior
- Modals should only close via explicit user action: Cancel button or X button
- Apply this fix to all modals: New Project, Edit Project, New Contractor, Budget forms, etc.
- Consider adding an "unsaved changes" warning if user tries to close with data entered
- Test on both desktop and mobile

---

## Task 4: Add Auto-Refresh After Save
**Priority:** HIGH
**Effort:** 2-3 hours

### Problem
When users save changes (creating a new project, editing contractor info, updating budgets, etc.), the page does not automatically update to reflect the changes. Users must manually refresh the browser to see their saved data appear in lists or update in cards. This creates confusion - users aren't sure if their save actually worked.

### Task
- After successful API save response, automatically refresh the relevant data
- Apply to all CRUD operations: Create, Update, Delete
- Focus areas: projects list, contractors, budgets, payments, daily logs
- Show success toast/notification before refresh
- Maintain user's scroll position where possible
- Consider optimistic UI updates for better UX

---

## Task 5: Build Consolidated Project Dashboard (Priority View)
**Priority:** CRITICAL (Dan's #1 Request)
**Effort:** 40-60 hours

### Problem
Dan's biggest pain point: **There's no single view showing everything that needs attention across all projects.** The current dashboard is project-focused - you select a project and see its details. But Dan manages 10+ active projects simultaneously and needs to see ALL priority items in ONE place.

Without this consolidated view, critical items "fall through the cracks" - like calling an inspector who was supposed to get back to them, or following up on a bid that's been pending too long. Dan can't understand overall construction capacity (which crews are tied up where) or know where to apply pressure.

**Dan's exact quote:** "This is THE reason I want to use the app day-to-day. Without this, there's no reason to open it."

### Task
Build a unified, cross-project priority dashboard showing:
- **Priority List (1-5 ranking):** All active items across all projects with user-assigned priority
- **Completion Status:** Visual progress per project (% complete, phase, etc.)
- **Blockers/Waiting Items:** What's blocking progress (waiting on inspector, waiting on bid, waiting on materials, etc.)
- **Construction Capacity:** Which crews are assigned where, what capacity exists to take on new work
- **Quick Filters:** By priority level, by blocker type, by project, by crew
- **Eventually:** Budget vs actual, ahead/behind schedule indicators

**Example Items That Should Appear:**
- Priority 1: "Call inspector about final inspection at 31 Park" (waiting 3 days)
- Priority 2: "Review emergency repair bid for 90 Park" (submitted yesterday)
- Priority 3: "Schedule retaining wall work at 213 Buckingham" (bid approved, waiting to schedule)
- Priority 4: "Order materials for Studio at Weston" (crew starts Monday)

**User Flow:**
1. Dan opens app → sees consolidated dashboard immediately
2. Scans priority 1-2 items first
3. Clicks item → jumps to project detail or task detail
4. Can re-prioritize by dragging or clicking
5. Can mark item complete or add blocker note

**Technical Requirements:**
- New database table: `priority_items` (linked to projects, tasks, bids, inspections, etc.)
- Priority field (1-5)
- Status field (open, blocked, waiting, in_progress, complete)
- Blocker type (inspector, bid, materials, weather, other)
- Due date / age (days waiting)
- Real-time updates
- Mobile responsive
- Fast loading (< 1 second)

**Projects to Include (Dan's Active List):**
- Studio at Weston
- 31 Park
- 213 Buckingham retaining wall
- Unit turnovers
- 90 Park emergency
- 15 Whitmore emergency
- Zach's house (New City)
- 165 Westland
- 10 Walkit
- Park Portfolio Water Conservation

---

## Task 6: Load Real Project Data
**Priority:** HIGH
**Effort:** 6-10 hours

### Problem
The app currently contains 100% test data with fake project names, budgets, and timelines. Dan wants to start using the app for real work, but can't until his actual projects are loaded with accurate information. Without real data, he can't test workflows, train his team, or use the app day-to-day.

### Task
Coordinate with Dan to load his active projects with real information:

**Projects to Load:**
1. Studio at Weston
2. 31 Park
3. 213 Buckingham retaining wall
4. Unit turnovers (multiple units)
5. 90 Park emergency
6. 15 Whitmore emergency
7. Zach's house (New City)
8. 165 Westland
9. 10 Walkit
10. Park Portfolio Water Conservation (upcoming)

**Data to Collect Per Project:**
- Project name and address
- Client/owner information
- Budget and contract amount
- Start and completion dates
- Assigned contractors and trades
- Current phase/status
- Budget line items
- Any existing payments made
- Photos if available

**Implementation:**
- Create data import spreadsheet template
- Dan fills out project details
- Import via API or database script
- Verify data accuracy with Dan
- Remove or archive test projects
- Set up proper project numbering system

---

## Task 7: Build Truck Inventory Management
**Priority:** MEDIUM
**Effort:** 15-20 hours

### Problem
Dan's team needs to track tools, equipment, and materials across multiple trucks and job sites. Currently there's no system to know what's in each truck, what's at each site, or when tools go missing. This causes delays when crews show up to a job without the right equipment.

Listed in Dan's priorities as a "quick build" - relatively simple feature with high practical value for field crews.

### Task
Build a truck and inventory management system:

**Features:**
- **Truck Registry:** List of all company trucks with identifiers
- **Inventory Items:** Tools, equipment, materials catalog
- **Current Location:** Track what's in each truck or at each project site
- **Check In/Out System:** Log when items move between locations
- **Low Stock Alerts:** Notify when consumables (nails, screws, etc.) are low
- **Assignment Tracking:** Who has what equipment
- **Search:** Find where a specific tool is located
- **Mobile-First:** Field crews use phones to check items in/out

**Use Cases:**
- Foreman checks what tools are in Truck #3 before assigning it to a job
- Crew checks out power tools to a site, checks them back in when done
- Office gets alert that Truck #2 needs more lumber
- Find which site has the laser level when another crew needs it

---

## Task 8: Implement Branch-Based Deployment Workflow
**Priority:** CRITICAL
**Effort:** 4-8 hours

### Problem
**The user/RLS bug that broke production was caused by pushing changes directly to the main/production branch without testing.** Changes were deployed the night before Dan's demo, and the next day he couldn't create projects or assign contractors during the live call. This was embarrassing and blocked critical functionality.

Dan specifically said: **"Stop pushing directly to production. Use branches. Test before deploying. If something breaks, communicate it immediately."**

### Task
Implement proper deployment workflow and safeguards:

**Git Workflow:**
- Create `development`, `staging`, and `production` branches
- Set up branch protection rules (no direct pushes to production)
- Require pull requests with code review
- Run automated tests on PRs before merging

**Environments:**
- **Development:** Local development, can be broken
- **Staging:** Test environment matching production (test.example.com)
- **Production:** Live app customers use (app.example.com)

**Deployment Process:**
1. Developer creates feature branch from `development`
2. Completes feature, opens PR to `development`
3. Code review required before merge
4. Merge to `development`, auto-deploy to dev environment
5. Test thoroughly on dev
6. Open PR from `development` to `staging`
7. Deploy to staging, test with real-like data
8. Dan approves for production
9. Merge `staging` to `production`, deploy

**Documentation:**
- Write deployment checklist
- Document rollback procedure
- Create incident response plan
- Train team on new process

**Immediate Action:**
- **Stop all direct pushes to production immediately**
- Review recent changes that caused RLS bug
- Add this to team standards documentation

---

## Task 9: Schedule Banner App Demo
**Priority:** LOW
**Effort:** N/A (coordination task, not development)

### Problem
Dan found a competing app called "Banner" that does something similar to what's being built. He wants to see how they approach the construction management workflow to understand what competitors are doing well and what features users expect.

This is competitive intelligence - not to copy them, but to understand the market and ensure the app being built is competitive.

### Task
- Dan sends Banner app link to team
- Schedule a joint demo/review session with Dan and Alex
- During demo, take notes on:
  - What features do they have that we don't?
  - How do they handle the consolidated dashboard?
  - What's their UX approach?
  - What are users saying in reviews?
  - Pricing model?
- Discuss which ideas are worth incorporating
- Document findings

**Note:** This is not a development task, just coordination and research.

---

## Task 10: Plan QuickBooks Integration
**Priority:** LOW (Future Planning)
**Effort:** N/A (requirements gathering phase)

### Problem
Eventually, the app needs to integrate with QuickBooks for payments, invoicing, and accounting. This is a planned feature but not immediate. Dan mentioned it as the direction for handling payments and invoices long-term.

The app was architecturally designed with this integration in mind, but detailed requirements are needed before building.

### Task
**When Ready to Start:**
- Meet with Dan to understand current QuickBooks usage
- Document what data needs to sync:
  - Payment applications → QuickBooks invoices
  - Approved payments → QuickBooks payments
  - Contractors → QuickBooks vendors
  - Projects → QuickBooks customers/jobs
  - Budget line items → QuickBooks chart of accounts
- Research QuickBooks API capabilities and limitations
- Decide on sync frequency (real-time vs batch)
- Plan data mapping and transformation logic
- Estimate development effort
- Create detailed technical design

**QuickBooks Integration Scope (Future):**
- Auto-create invoices from approved payment applications
- Sync vendor/contractor information
- Push approved payments to QB for check printing
- Pull project budgets from QB (if they track there)
- Reconcile payments between systems
- Handle QB Online vs QB Desktop differences

**Note:** Not immediate. Focus on core app functionality first, add QuickBooks later.

---

## Summary

**CRITICAL Priority (Do First):**
1. Task 1: Fix RLS Bug - Create Projects
2. Task 2: Fix RLS Bug - Assign Contractors
3. Task 5: Build Consolidated Dashboard (Dan's #1 feature request)
4. Task 8: Implement Proper Deployment Workflow

**HIGH Priority (Next):**
5. Task 3: Fix Modal Dismiss Behavior
6. Task 4: Add Auto-Refresh After Save
7. Task 6: Load Real Project Data

**MEDIUM Priority (Backlog):**
8. Task 7: Build Truck Inventory Management

**LOW Priority (Future):**
9. Task 9: Schedule Banner Demo
10. Task 10: Plan QuickBooks Integration

**Total Estimated Effort:** 72-111 hours across development tasks
