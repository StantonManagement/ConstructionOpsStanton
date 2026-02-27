# Consolidated Project Dashboard — PRD

**Priority:** CRITICAL (#1 Feature Request)
**Requested By:** Dan
**Estimated Effort:** 40-60 hours
**Status:** Ready for Development
**Date:** February 2026

---

## Executive Summary

> **Dan's Quote:** _"This is THE reason I want to use the app day-to-day. Without this, there's no reason to open it."_

Dan manages 10+ active construction projects simultaneously. Things that need attention — call the inspector back, chase a bid, unblock a crew — live in texts, mental notes, and scattered conversations. **There is no single place to see "here's everything that matters right now, ranked."**

**The Core Problem:** Priorities shift constantly throughout the day. When an emergency at 10am buries the follow-up from 8am, critical items fall through the cracks. Without a system that makes reprioritization fast and visible, construction executives lose track of what needs pressure.

---

## The Problem in Detail

### Current State
- App contains 100% test data — no real projects loaded
- No unified view of cross-project priorities
- Critical follow-ups tracked in texts, mental notes, conversations
- No way to see what got "bumped" when emergencies arise
- Nobody has a reason to open the app daily

### Pain Points
1. **Priorities shift multiple times per day** — emergency repair bumps planned work, bid deadlines shift schedules
2. **Items that got deprioritized disappear** — when Priority 2 becomes Priority 4 due to emergency, it sits untouched for days
3. **No visibility into construction capacity** — can't see which crews are tied up where, what can be taken on
4. **Blockers aren't surfaced** — waiting on inspector for 3 days, contractor no-show, bid past deadline
5. **Can't answer "what needs my attention right now?"** across all projects

---

## Design Principle

> **This is a triage tool, not a task list.**

Assumptions:
- Priorities will change multiple times per day
- Re-ranking must be instant — drag or tap, not a form
- Items that got bumped down are just as important as what got bumped up
- Items untouched for X days should surface automatically
- Primary user is a construction executive managing a portfolio, not a field PM

---

## What Dan Sees When He Opens the App

One screen answering five questions:

1. **What needs my attention right now?** — Prioritized action items across ALL projects
2. **Where is pressure needed?** — Blockers, waiting-on items, overdue follow-ups
3. **What's the overall status of each project?** — Completion %, phase, health signal
4. **What's our capacity?** — What's consuming crews, what can we take on
5. **What got bumped?** — Things deprioritized but never resolved

---

## Core Feature: Priority List (Action Items)

### What Are Action Items?

NOT construction tasks (paint unit 3B, install outlets). These are the **management layer** — decisions, follow-ups, pressure points, things that fall through cracks.

**Examples:**
- "Insurance inspection tomorrow at 90 Park — prep the units"
- "Call inspector — was supposed to get back to us 3 days ago"
- "Retaining wall bid responses due today"
- "HVAC contractor hasn't started, was scheduled Monday"
- "Unit 3B punch list ready for verification walk"
- "Water conservation project — need to schedule kickoff"

### Priority Levels (1-5)

| Level | Meaning | When to Use |
|-------|---------|-------------|
| **1** | Drop everything | Insurance inspection tomorrow, emergency water damage, safety issue |
| **2** | Today / this week | Bid due today, contractor no-show, time-sensitive follow-up |
| **3** | Active — needs a push | Punch list walk, material order follow-up, scheduling call |
| **4** | Tracked — on the radar | Upcoming project kickoff, budget review due next week |
| **5** | Parked | Deferred intentionally, waiting on external timeline |

**Priority is manual** — Dan sets and adjusts based on judgment.

### Reprioritization Must Be Instant

When the insurance inspector calls, Dan needs to:
1. Add new item or find existing one
2. Set it to Priority 1
3. See it jump to the top

**This should take under 5 seconds.**

#### Required Interactions:
- **Quick-add from dashboard:** Title + project dropdown + priority picker (description optional, fill later)
- **Tap-to-reprioritize:** Tap priority badge → pick new level → list reorders instantly
- **Drag reorder within tier** (desktop): Drag 4 Priority 2 items into preferred order

### Action Item Types

| Type | Meaning |
|------|---------|
| `emergency` | Unplanned, time-critical — water damage, insurance, safety |
| `blocker` | Something preventing progress on project |
| `waiting_on_external` | Ball in someone else's court — inspector, city, insurance |
| `waiting_on_bid` | Bid round open, waiting for contractor responses |
| `waiting_on_contractor` | Contractor committed but hasn't delivered |
| `decision_needed` | Dan or team needs to make call before work proceeds |
| `verification_needed` | Work reported complete, needs PM walk or photo verification |
| `follow_up` | General follow-up — call someone, check on something |
| `upcoming` | Not urgent yet but needs to be scheduled soon |

### "Waiting On" Field

Any item in waiting state should track:
- **Who/what** we're waiting on (free text: "Inspector Mike", "ABC Electric bid")
- **Since when** — date waiting started
- **Follow-up date** — when to nag if no response

Items past follow-up date get visual indicator (Dan decides if it escalates).

### Action Item Statuses

| Status | Meaning |
|--------|---------|
| `open` | Needs attention, not started |
| `in_progress` | Someone actively working on it |
| `waiting` | Ball in someone else's court |
| `resolved` | Done — include short resolution note |
| `deferred` | Intentionally pushed out — tracked but not active |

Resolved items disappear from active list but remain searchable.

### **CRITICAL: Bumped Items — "What Got Buried" Problem**

When Priority 2 item gets knocked to Priority 4 due to emergency, it can sit unnoticed for days.

**Rule:** If item's priority was decreased and hasn't been touched (no status change, note, or resolution) for configurable days (default: 3), system surfaces it in **"Needs Review"** section.

Not auto-escalation — a nudge: _"You deprioritized this 3 days ago. Is it still parked or does it need attention?"_

**System Must Track:**
- When priority last changed
- What the previous priority was
- Days since last meaningful update

---

## Project Health Overview

Below/alongside priority list, Dan needs snapshot of every active project.

### Projects to Load (Real Data — Day 1)

| Project | Type |
|---------|------|
| Studio at Weston | Renovation |
| 31 Park | Renovation / unit turnovers |
| 213 Buckingham | Retaining wall (single scope) |
| Unit turnovers (various) | Recurring turnover work |
| 90 Park | Emergency repairs |
| 15 Whitmore | Emergency repairs |
| Zach's house (New City) | External / owner project |
| 165 Westland | Renovation |
| 10 Walkit | Renovation |
| Park Portfolio Water Conservation | Upcoming / planning phase |

### What Each Project Card Shows

- **Project name** and property
- **Phase:** Planning, Demo, Rough-In, Finishing, Punch List, Complete
- **Completion %:** Derived from task/location progress or manually set
- **Health signal:** Green / Yellow / Red — based on action items
- **Active action item count:** e.g., "3 open items (1 blocker)"
- **Next milestone or deadline** if set

Clicking card navigates to existing project detail view.

### Health Signal Logic (Derived, Not Manual)

- **Green:** No P1-2 items. No items past follow-up date. On track.
- **Yellow:** Has P2 items, OR items past follow-up date, OR completion behind pace.
- **Red:** Has P1 items, OR blockers older than 3 days with no update, OR flagged emergency.

---

## Capacity View

Dan needs to understand construction capacity — what's consuming crews, what team can absorb.

### Phase 1 (MVP): Simple Crew Loading

Lightweight view showing:
- **Active projects by phase** — how many in Demo vs. Rough-In vs. Finishing
- **Contractor utilization** — which contractors assigned to active work across how many projects
- **What's starting soon** — projects/tasks with scheduled start dates in next 2 weeks

Read-only roll-up of existing project and task data. No resource management engine needed.

### Phase 2 (Later — Out of Scope)
- Budget vs. actual by project
- Ahead/behind schedule indicators
- "Can we take on new project?" decision support

---

## Filters and Views

Default view is unified priority list. Dan should be able to slice it.

### Filter Options

- **By project:** Show only items for 31 Park
- **By type:** Show all blockers, or all waiting-on-external items
- **By priority:** Show only P1-2 (crisis mode)
- **By status:** Show deferred items, or resolved items for review
- **By assignee:** If multiple people using system

### Saved Views (Nice to Have, Not MVP)

Saved filter combinations like "Morning Review" (P1-3, all projects) or "Weekly Review" (all items including deferred).

---

## Auto-Generated Action Items

Some items created automatically from system data. Appear in list like any other but tagged as system-generated. Dan can promote, demote, or dismiss.

| Trigger | Creates | Default Priority |
|---------|---------|------------------|
| Task blocked 2+ days | "Blocker: {task} at {project} — {reason} for {N} days" | 3 |
| Bid responses due today/tomorrow | "Bid responses due: {scope} at {project}" | 2 |
| Bid round 0 responses 2 days past due | "No bid responses: {scope} — follow up or extend" | 2 |
| Worker marked complete, not verified 3+ days | "Verification needed: {task} at {location}" | 3 |
| Scheduled task start date passed, no status change | "Not started: {task} at {project} — was scheduled {date}" | 3 |

Auto-generated items visually distinguishable from manual ones (subtle indicator).

---

## Data Migration: Real Projects Required

**This is a prerequisite, not a follow-up.** Dashboard is useless without real data.

### Steps

1. **Purge all test data** from projects, properties, tasks, contractors, related tables
2. **Create 10 real projects** listed above with:
   - Project name, type, associated property (if applicable)
   - Current phase (provided by Dan during onboarding)
   - Known contractors
3. **Seed initial action items** — Dan does one-time brain dump of what's active, waiting, blocked across all projects (starting state)
4. **Connect to existing data model** — projects link to portfolio → property → location → task hierarchy where applicable

### Project Types to Support

Not all projects fit portfolio → property → unit model:

- **Portfolio renovation** (31 Park, 165 Westland) — full hierarchy, many units
- **Single-scope** (213 Buckingham retaining wall) — one project, one deliverable
- **Emergency** (90 Park, 15 Whitmore) — may start with zero planning data
- **External** (Zach's house) — outside portfolio, tracked for capacity only
- **Upcoming/planning** (Water Conservation) — no active work yet, just tracked

---

## UX Requirements

### Mobile-First

Dan is often not at desk. Dashboard, quick-add, reprioritization must work well on phone.

- Touch targets sized for construction site (large, well-spaced)
- Priority list scrollable with clear visual separation between tiers
- Quick-add accessible from persistent button (FAB or sticky header)

### Color as Signal, Not Decoration

Per existing design principles — most interface is neutral. Color appears only for:

- Priority badges (red/orange/yellow for 1-3, neutral for 4-5)
- Health signals on project cards (green/yellow/red)
- Overdue or stale indicators
- Nothing else

### Speed

- **Dashboard load:** Under 2 seconds with 50 action items and 10 projects
- **Reprioritization:** Instant (optimistic UI, sync in background)
- **Quick-add:** Item appears in list immediately after submission

---

## What This PRD Does NOT Cover

These are real needs but separate work:

- Budget vs. actual tracking (Phase 2 of capacity)
- Schedule management / Gantt (exists separately)
- Payment processing (existing feature)
- Bid management detail screens (action items link to bid rounds)
- SMS / contractor communication (action items may trigger follow-ups)
- Photo verification flow (dashboard surfaces "needs verification" but verification UX lives in project detail)

---

## Success Criteria

1. ✅ Dan opens app every morning and uses it to plan his day
2. ✅ When priorities shift mid-day, dashboard reflects change in under 10 seconds
3. ✅ Nothing that was active falls off radar — bumped items surface automatically
4. ✅ Dan can answer "what's status of {project}?" from dashboard without drilling in
5. ✅ Real projects with real data are loaded and maintained

---

## Build Sequence

### **Phase 1: Foundation (Must Ship Together)** — 16-24 hours

**Data Layer:**
- [ ] Purge all test data (projects, properties, tasks, contractors)
- [ ] Create `action_items` table with fields:
  - `id`, `title`, `description`, `project_id`, `priority` (1-5), `type`, `status`
  - `assigned_to`, `waiting_on`, `follow_up_date`, `created_at`, `updated_at`
  - `source` (manual/auto), `resolution_note`, `priority_changed_at`, `previous_priority`
- [ ] Seed 10 real projects from Dan's list
- [ ] Create initial action items from Dan's brain dump

**API Layer:**
- [ ] `GET /api/action-items` — fetch all action items with project data
- [ ] `POST /api/action-items` — create new action item
- [ ] `PATCH /api/action-items/:id` — update priority, status, or fields
- [ ] `DELETE /api/action-items/:id` — soft delete (mark resolved)
- [ ] `GET /api/dashboard/summary` — roll-up stats for dashboard

**UI Layer:**
- [ ] Dashboard page (`/dashboard` or `/`) with priority list
- [ ] Action item cards with priority badge, project tag, type, status
- [ ] Quick-add form (title + project dropdown + priority picker)
- [ ] Tap-to-reprioritize (priority badge opens 1-5 picker)
- [ ] Expand item to see details and change status
- [ ] Project health cards (name, phase, completion %, action item count)

**Reference:** See `/Users/zeff/Downloads/dashboard_mockup.jsx` for UI implementation

---

### **Phase 2: Intelligence** — 12-18 hours

- [ ] **Auto-generated action items** from system data:
  - Task blocked 2+ days → blocker item
  - Bid responses due today/tomorrow → bid deadline item
  - Bid round 0 responses 2 days past due → follow-up item
  - Worker marked complete 3+ days → verification item
  - Scheduled task start passed, no status change → not started item
- [ ] **Bumped item detection:**
  - Track when priority last changed, previous priority, last meaningful update
  - Surface items deprioritized and untouched for 3+ days in "Needs Review" section
- [ ] **Follow-up date tracking** with overdue indicators (red badge if past date)
- [ ] **Health signal derivation** for project cards:
  - Red: Has P1 items OR blockers 3+ days old
  - Yellow: Has P2 items OR items past follow-up date
  - Green: All clear

---

### **Phase 3: Capacity** — 8-12 hours

- [ ] **Active projects by phase view** — count of projects in each phase
- [ ] **Contractor utilization roll-up** — which contractors on how many projects
- [ ] **Starting-soon timeline** — projects/tasks with start dates in next 2 weeks
- [ ] Capacity snapshot widget on dashboard

---

### **Phase 4: Refinement** — 4-6 hours

- [ ] **Filters:** By project, type, priority, status, assignee
- [ ] **Saved views** (optional) — "Morning Review" (P1-3), "Weekly Review" (all)
- [ ] **Resolution history** — view resolved items with notes, search/filter
- [ ] **Audit trail** — who changed priority when, status changes
- [ ] **Weekly summary/digest view** (optional)

---

## Database Schema

### `action_items` Table

```sql
CREATE TABLE action_items (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  project_id INT REFERENCES projects(id) ON DELETE CASCADE,
  priority INT NOT NULL CHECK (priority BETWEEN 1 AND 5),
  type TEXT NOT NULL CHECK (type IN (
    'emergency', 'blocker', 'waiting_on_external', 'waiting_on_bid',
    'waiting_on_contractor', 'decision_needed', 'verification_needed',
    'follow_up', 'upcoming'
  )),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'in_progress', 'waiting', 'resolved', 'deferred'
  )),
  assigned_to INT REFERENCES users(id),
  waiting_on TEXT,
  follow_up_date DATE,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  auto_trigger TEXT, -- for auto-generated items: 'bid_due', 'task_blocked', etc.
  resolution_note TEXT,
  priority_changed_at TIMESTAMP,
  previous_priority INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_action_items_project ON action_items(project_id);
CREATE INDEX idx_action_items_priority ON action_items(priority);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_action_items_follow_up ON action_items(follow_up_date);
```

---

## Technical Notes

### Performance Considerations

- **Dashboard query optimization:** Single query to fetch action items + projects + health data
- **Optimistic UI:** Priority changes appear instantly, sync to backend in background
- **Caching:** Cache project health signals, invalidate on action item changes
- **Pagination:** If action items exceed 100, paginate or use virtual scrolling

### Mobile Responsiveness

- Stack priority list and project health on mobile (not side-by-side)
- Large touch targets (44x44px minimum) for priority badges
- Swipe gestures for quick actions (optional)

### Notifications

- SMS notification when action item assigned to contractor
- Email digest of P1-2 items every morning
- Push notification for overdue follow-ups (optional)

---

## Dependencies

### Must Be Done First:
1. **Task 1: Fix RLS Bug — Create Projects** (blocking production)
2. **Task 2: Fix RLS Bug — Assign Contractors** (blocking production)
3. **Task 6: Load Real Project Data** (prerequisite for dashboard)

### Can Be Done In Parallel:
- **Task 3: Fix Modal Dismiss Behavior**
- **Task 4: Add Auto-Refresh After Save**

---

## Reference Files

- **PRD Source:** User-provided PRD document
- **UI Mockup:** `/Users/zeff/Downloads/dashboard_mockup.jsx` (fully functional React prototype)
- **Related Task:** `TASKS_FROM_DAN_CHECKIN.md` — Task 5

---

## Questions for Dan

Before starting development:

1. **Action item seeding:** Can Dan provide initial brain dump of 20-30 active items across projects?
2. **Priority definitions:** Are the 1-5 definitions above accurate for his workflow?
3. **Bumped item threshold:** Is 3 days the right threshold for surfacing stale items?
4. **Capacity metrics:** Which contractors are most important to track utilization for?
5. **Mobile usage:** What % of time will this be used on phone vs. desktop?

---

**Total Estimated Effort:** 40-60 hours
**Complexity:** High — touches data model, API, UI, and requires real data migration
**Business Impact:** CRITICAL — Dan's #1 reason to use the app daily
