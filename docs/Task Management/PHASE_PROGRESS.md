# Task Management PRP — Phase Progress Tracker

This file tracks completion of `docs/Task Management/*` phases against the actual codebase.

Update this file as work is implemented.

---

## Legend

- [ ] Not started
- [~] In progress
- [x] Done

---

## PHASE 1 — Foundation (`PHASE_1_FOUNDATION.md`)

- [~] Database tables/views exist (locations, tasks, templates baseline)
- [~] CRUD APIs exist and are auth-protected
- [~] UI can list locations and tasks and handle basic updates

**Key routes/APIs to verify**
- `/api/locations/*`
- `/api/tasks/*`
- `/api/templates/*` (if Phase 2 not started, keep placeholder)

---

## PHASE 2 — Templates (`PHASE_2_TEMPLATES.md`)

- [x] Template creation (multiple tasks)
- [x] Template task ordering/reordering (Drag & Drop UI + API)
- [x] Apply template to property/locations (bulk create) w/ dependency support

**Key routes/APIs to verify**
- `/api/templates`
- `/api/templates/[id]`
- `/api/templates/[id]/tasks`
- `/api/templates/apply`

---

## PHASE 3 — Field Tool (`PHASE_3_FIELD_TOOL.md`)

- [x] Punch list page loads and shows tasks
- [x] Task status transitions enforce business rules
- [x] Photo verification upload flow
- [x] Block/unblock location and block task flow

**Key routes/APIs to verify**
- `/api/tasks/[id]/status`
- `/api/upload/verification-photo`
- `/api/tasks/[id]/dependencies`
- `/api/locations/[id]/block`

---

## PHASE 4 — Blocking + Visibility (`PHASE_4_BLOCKING.md`)

- [x] Property dashboard rollups/stats
- [x] Blocking report grouped by reason
- [x] Trade report

**Key routes/APIs to verify**
- `/api/properties/[id]/stats` (alias ok)
- `/api/reports/blocking`
- `/api/reports/trade`

---

## PHASE 5 — Cash Flow (`PHASE_5_CASH_FLOW.md`)

- [x] Cash flow forecast API + UI
- [x] Draw eligibility API + UI
- [x] Draws CRUD + linking verified tasks to draws

**Key routes/APIs to verify**
- `/api/cash-flow/forecast`
- `/api/cash-flow/draw-eligibility`
- `/api/draws/*`

---

## PHASE 6 — AI + Automation (`PHASE_6_AI_AUTOMATION.md`)

- [x] AI photo analysis endpoint
- [x] AI analysis integrated into verification UX
- [x] Dependencies: add/remove + blocks list + circular prevention
- [x] Auto-schedule runs when prerequisite task is verified (and does not override already scheduled/started tasks)
- [x] SMS automation flows
  - [x] Task assigned SMS sends (rate limited)
  - [x] Unblock SMS sends to assigned contractors (rate limited)
  - [x] SMS log API + UI
  - [x] Daily reminder cron endpoint exists

**Key routes/APIs to verify**
- `/api/ai/analyze-photo`
- Any SMS/cron endpoints used by automation

---

## Running Change Log

### 2025-01-19
- **Phase 2 (Templates) - COMPLETE**: Implemented drag-and-drop reordering for template tasks using @dnd-kit.
  - Added `PUT /api/templates/[id]/tasks` endpoint for bulk reordering.
  - Added `useReorderTemplateTasks` hook in `useTemplates.ts`.
  - Updated `TemplateDetailView.tsx` with `SortableTaskRow` component and drag handlers.
  - Updated bulk location creation to include dependency creation when applying templates.
- **Phase 3 (Field Tool) - VERIFIED COMPLETE**: All components implemented and functional.
  - Location punch list page: `src/app/renovations/locations/[id]/page.tsx`
  - Task status transitions API with business rules: `src/app/api/tasks/[id]/status/route.ts`
  - Photo verification modal and upload flow working.
  - Block/unblock location modals and API endpoints functional.
- **Phase 4 (Blocking + Visibility) - VERIFIED COMPLETE**: All APIs and UI pages implemented.
  - Database views: `location_stats`, `project_stats`, `blocking_report` (migration 003).
  - Project stats API: `/api/projects/[id]/stats`
  - Blocking report API and UI: `/api/reports/blocking`, `src/app/reports/blocking/page.tsx`
  - Trade report API and UI: `/api/reports/trade`, `src/app/reports/trade/page.tsx`
  - StatusFilter component: `src/components/StatusFilter.tsx`
  - React Query hooks: `useReports.ts` with `useBlockingReport` and `useTradeReport`.
- **Phase 5 (Cash Flow) - VERIFIED COMPLETE**: All cash flow and draws functionality implemented.
  - Database tables: `construction_draws`, `draw_line_items` (migration 004).
  - Database views: `cash_flow_forecast`, `draw_eligibility`.
  - Forecast API: `/api/cash-flow/forecast`
  - Draw eligibility API: `/api/cash-flow/draw-eligibility`
  - Draws CRUD APIs: `/api/draws/*` including submit, approve, fund endpoints.
  - Cash flow UI pages: `src/app/cash-flow/page.tsx`, forecast, draw-eligibility.
  - Draws UI pages: `src/app/draws/new/page.tsx`, `src/app/draws/[id]/page.tsx`
  - React Query hooks: `useCashFlow.ts` and `useDraws.ts`.

### 2025-12-19
- Created this tracker file.
- Added `/api/tasks/[id]/dependents` and wired dependency + blocks UI.
- Added transitive circular dependency prevention.
- Added SMS rate limiting + task assignment/unblock notifications + `/sms-logs` authFetch.
