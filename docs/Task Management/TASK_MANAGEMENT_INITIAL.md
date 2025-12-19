# Property Task Management System — INITIAL

> Context engineering document for Windsurf. This describes WHAT we're building and WHY.
> Implementation details are in the phase-specific PRP files.

---

## FEATURE

Build a task management system for tracking ~400 unit renovations across multiple properties within 6-week acquisition timelines.

**Core capability**: Know at any moment which units are done, in progress, or blocked—and why. Enable cash flow forecasting for construction loan draws based on verified completed work.

**This is NOT**:
- A generic project management tool
- An enterprise construction platform
- A contractor-facing portal

**This IS**:
- An internal operations tool for a 2-person team (Dean in field, Alex on accounting)
- Built around the insight that "worker's version of complete is not ours"
- Optimized for speed of setup (templates) and verification (photos)

---

## DATA HIERARCHY

```
Property → Location → Task
```

- **Property**: Already exists as `c_properties` table (e.g., "31 Park", "45 Main")
- **Location**: Any place work happens—unit, common area, exterior, hallway
- **Task**: Individual work item with two-stage completion

**Why no Building level?** We rarely have multiple buildings per property. Adds complexity for no benefit. Can add later.

---

## KEY BUSINESS RULES

### 1. Two-Stage Completion
Workers lie (or have different standards). Managers verify.

```
not_started → in_progress → worker_complete → verified
```

- **Cannot mark `verified` without uploading a photo**
- **Only PM/Admin role can verify** — workers can mark complete, not verify
- Photo creates accountability and audit trail for loan draws

### 2. Blocking with Reasons
Anything can go on hold, but we need to know WHY to take action.

**Blocking reasons**: `materials`, `labor`, `cash`, `dependency`, `other`

Each blocked item needs a note: "Waiting on flooring order #1234, ETA Jan 5"

Dashboard groups by reason: "4 waiting on materials, 8 need labor" → actionable.

### 3. Templates for Speed
Can't manually create tasks for 400 units.

- **Global templates**: "1BR Standard", "2BR Premium", "Common Area Refresh"
- **Apply template** → creates all tasks for that location instantly
- **Bulk unit creation**: "Add units 101-120, type 1BR, apply template" → 200 tasks in seconds

### 4. Derived Status
Location status is DERIVED from tasks, not stored separately:
- All tasks `verified` → location `complete`
- Any task `in_progress` → location `in_progress`
- All tasks `not_started` → location `not_started`

### 5. Cash Flow = Two Questions

**Forecast** (date-driven): "What do we need available next week?"
- Sum scheduled task costs by week
- Compare to available funds / loan balance

**Draw eligibility** (progress-driven): "What can we draw now?"
- Sum costs of verified work only
- Feed into loan draw request

---

## USER FLOWS

### Dean's Daily Flow (Field PM)
1. Open property dashboard → see what needs attention
2. Filter to on-hold or in-progress
3. Walk units, open each location on phone
4. For each completed task: take photo → verify
5. If blocked: set reason + note
6. Dashboard updates automatically

### Alex's Flow (Accounting)
1. Cash flow view → see week's needs
2. Compare to loan balance
3. Request draw based on verified work total
4. Pay contractors based on their verified tasks

### Bulk Setup (New Property)
1. Create property (already exists)
2. Add units: "101-120, 1BR" → creates 20 locations
3. Select all → Apply "1BR Standard" template
4. 200 tasks created, ready for scheduling

---

## EXAMPLES — REFERENCE THESE FILES

### For API Routes
- `src/app/api/projects/route.ts` — GET/POST pattern with withAuth
- `src/app/api/users/route.ts` — additional pattern reference

### For React Query Hooks
- `src/hooks/queries/useProjects.ts` — query + mutation pattern

### For Components
- `src/components/ProjectCard.tsx` — card component pattern
- `src/app/components/EntityManagementView.tsx` — feature view pattern

### For Types
- `src/types/schema.ts` — ALWAYS check here before defining new types

### For Database Patterns
- `DATABASE_SCHEMA.md` — existing table structures
- Query `information_schema.tables` before creating tables

---

## DOCUMENTATION

### Internal Docs to Read
- `WINDSURF_SYSTEM.md` — component/API patterns
- `CODING_CONVENTIONS.md` — detailed coding rules
- `STYLE_AND_DESIGN_SYSTEM.md` — color = signal philosophy
- `_windsurfrules` — quick reference anti-patterns

### Existing Features to Connect
- `budget_categories` table — tasks link here for cost rollup
- `contractors` table — tasks can be assigned to contractors
- Gantt implementation exists — will show tasks grouped by location
- Photo storage via Supabase Storage — see `Web_Camera_Capture_-_Implementation_Guide.md`

---

## OTHER CONSIDERATIONS

### What AI Assistants Commonly Miss

1. **Don't create new UI primitives** — check `src/components/ui/` first
2. **Don't redefine types** — import from `src/types/schema.ts`
3. **Don't use useEffect + fetch** — use React Query
4. **Don't access Supabase from client** — go through API routes
5. **Check if table exists before CREATE** — query information_schema first

### Mobile-First Constraints
- Field PM uses phone in noisy construction site
- Touch targets minimum 44px
- Clear visual hierarchy — color is signal, not decoration
- Fast load times — they're on cell networks

### Multi-Tenant Pattern
- Use `tenant_id` column defaulting to `'00000000-0000-0000-0000-000000000001'`
- Properties already have `owner_entity_id` for LLC association

---

## BUILD SEQUENCE

| Phase | Focus | Outcome |
|-------|-------|---------|
| 1 | Foundation | `locations` + `tasks` tables, basic CRUD, list view |
| 2 | Templates | Template tables, bulk unit creation, apply template |
| 3 | Field Tool | Photo verification, enhanced punch list, mobile UX |
| 4 | Blocking & Visibility | Blocking UI, reports, dashboard rollups |
| 5 | Cash Flow | Forecast view, draw eligibility, budget integration |
| 6 | AI & Automation | Photo analysis, auto-scheduling, SMS notifications |

**See individual PRP files for each phase:**
- `PRPs/PHASE_1_FOUNDATION.md`
- `PRPs/PHASE_2_TEMPLATES.md`
- `PRPs/PHASE_3_FIELD_TOOL.md`
- `PRPs/PHASE_4_BLOCKING.md`
- `PRPs/PHASE_5_CASH_FLOW.md`
- `PRPs/PHASE_6_AI_AUTOMATION.md`
