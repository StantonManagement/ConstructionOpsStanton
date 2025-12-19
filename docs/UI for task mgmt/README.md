# PRPs — Product Requirements Prompts

> Context engineering files for building the Property Task Management System with Windsurf

---

## How to Use These Files

### Before Starting Any Phase

1. **Load the INITIAL file first:**
   ```
   @TASK_MANAGEMENT_INITIAL.md
   ```
   This gives Windsurf the full business context: who uses it, why decisions were made, what problems we're solving.

2. **Then load the specific phase PRP:**
   ```
   @PHASE_1_FOUNDATION.md
   ```

3. **Also load the system context:**
   ```
   @WINDSURF_SYSTEM.md
   @_windsurfrules
   ```

### Working Through a Phase

Each PRP has sections designed to guide Windsurf without writing the code for it:

| Section | Purpose |
|---------|---------|
| **Objective** | What success looks like |
| **Context to Load** | Files Windsurf should read for patterns |
| **Database Work** | Tables/views to create (structure, not SQL) |
| **API Endpoints** | Routes to create with request/response shapes |
| **UI Components** | Components to build with layout sketches |
| **Validation Gates** | How to verify the work is correct |
| **Business Rules** | Constraints that must be enforced |
| **Do Not** | Common mistakes to avoid |
| **Success Criteria** | Checklist for phase completion |

### Example Workflow

**Starting Phase 1:**

```
Me: Let's start Phase 1 of the task management system. 
    Load @TASK_MANAGEMENT_INITIAL.md and @PHASE_1_FOUNDATION.md

Windsurf: [reads files]

Me: Let's start with the database tables. Check if they exist first.

Windsurf: [queries information_schema, creates tables following the structure in the PRP]

Me: Now create the locations API endpoint following the pattern in src/app/api/projects/route.ts

Windsurf: [reads the reference file, creates new endpoint matching the pattern]
```

### Key Principles

1. **Reference, don't specify** — PRPs point to existing files for patterns rather than writing code
2. **Validate as you go** — Run the validation gates after each section
3. **Business rules are non-negotiable** — These come from real problems we've encountered
4. **"Do Not" is as important as "Do"** — These are mistakes we've made before

---

## File Structure

```
PRPs/
├── README.md                    # This file
├── TASK_MANAGEMENT_INITIAL.md   # Business context (read first always)
│
├── ─── BACKEND PHASES ───
├── PHASE_1_FOUNDATION.md        # Database + basic CRUD
├── PHASE_2_TEMPLATES.md         # Bulk creation + templates
├── PHASE_3_FIELD_TOOL.md        # Photo verification + mobile UX
├── PHASE_4_BLOCKING.md          # Reports + dashboard rollups
├── PHASE_5_CASH_FLOW.md         # Forecast + draw eligibility
├── PHASE_6_AI_AUTOMATION.md     # AI analysis + SMS + auto-schedule
│
├── ─── UI PHASES ───
├── UI_1_NAVIGATION.md           # Renovations nav section restructure
├── UI_2_PORTFOLIO.md            # Dashboard stats + property list
├── UI_3_LOCATIONS.md            # Dual-mode location grid
├── UI_4_DRAWS.md                # Draw eligibility + creation + tracking
└── UI_5_MOBILE.md               # Field experience optimizations
```

---

## Phase Dependencies

### Backend Phases
```
Phase 1 (Foundation)
    ↓
Phase 2 (Templates)
    ↓
Phase 3 (Field Tool) ←── requires Phase 1 tasks table
    ↓
Phase 4 (Blocking) ←── requires Phase 1-3 for data to report on
    ↓
Phase 5 (Cash Flow) ←── requires Phase 1 tasks with costs
    ↓
Phase 6 (AI & Automation) ←── requires all previous phases
```

### UI Phases
```
UI_1 (Navigation) ←── restructures existing routes
    ↓
UI_2 (Portfolio) ←── new page, uses existing APIs
UI_3 (Locations) ←── enhances existing LocationList
UI_4 (Draws) ←── new page, uses Phase 5 APIs
    ↓
UI_5 (Mobile) ←── optimizations across all pages
```

**Backend phases must be complete before UI phases.**
UI phases can be done in parallel after UI_1 (Navigation) is complete.

**You must complete phases in order.** Each phase builds on the previous.

---

## Estimated Effort

### Backend Phases (Complete)
| Phase | Complexity | Status |
|-------|------------|--------|
| 1. Foundation | Medium | ✅ Complete |
| 2. Templates | Medium | ✅ Complete |
| 3. Field Tool | High | ✅ Complete |
| 4. Blocking | Medium | ✅ Complete |
| 5. Cash Flow | High | ✅ Complete |
| 6. AI & Automation | High | ✅ Complete (mock mode) |

### UI Phases
| Phase | Complexity | Estimated Time |
|-------|------------|----------------|
| UI_1. Navigation | Low | 1 session |
| UI_2. Portfolio | Medium | 1-2 sessions |
| UI_3. Locations | Medium | 2 sessions |
| UI_4. Draws | High | 2-3 sessions |
| UI_5. Mobile | Medium | 2 sessions |

A "session" = one focused Windsurf conversation (~30-60 min)

---

## When Things Go Wrong

### Windsurf creates wrong pattern
→ Point it to the reference file explicitly:
```
Look at src/app/api/projects/route.ts and match that pattern exactly
```

### Windsurf skips validation
→ Paste the validation gate and ask it to run:
```
Run this validation: SELECT table_name FROM information_schema.tables...
```

### Windsurf ignores business rules
→ Quote the rule from the PRP:
```
Business rule: "Cannot verify without photo" — the API must reject verification if photo_url is null
```

### Windsurf creates new files instead of using existing
→ Remind it to check first:
```
Before creating a new component, check src/components/ui/ for existing ones
```

---

## Updating These PRPs

As you complete phases, update the PRPs with:
- Actual file paths created
- Any deviations from the plan
- New validation gates discovered
- Additional "Do Not" items learned

This keeps the PRPs accurate for future reference or if you need to rebuild.

---

## Related Files

| File | Location | Purpose |
|------|----------|---------|
| `WINDSURF_SYSTEM.md` | Project root | Component/API patterns |
| `_windsurfrules` | Project root | Quick reference anti-patterns |
| `CODING_CONVENTIONS.md` | Project root | Detailed coding rules |
| `STYLE_AND_DESIGN_SYSTEM.md` | Project root | UI/color philosophy |
| `DATABASE_SCHEMA.md` | Project root | Existing table structures |
