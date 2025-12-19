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
├── PHASE_1_FOUNDATION.md        # Database + basic CRUD
├── PHASE_2_TEMPLATES.md         # Bulk creation + templates
├── PHASE_3_FIELD_TOOL.md        # Photo verification + mobile UX
├── PHASE_4_BLOCKING.md          # Reports + dashboard rollups
├── PHASE_5_CASH_FLOW.md         # Forecast + draw eligibility
└── PHASE_6_AI_AUTOMATION.md     # AI analysis + SMS + auto-schedule
```

---

## Phase Dependencies

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

**You must complete phases in order.** Each phase builds on the previous.

---

## Estimated Effort

| Phase | Complexity | Estimated Time |
|-------|------------|----------------|
| 1. Foundation | Medium | 2-3 sessions |
| 2. Templates | Medium | 2-3 sessions |
| 3. Field Tool | High | 3-4 sessions |
| 4. Blocking | Medium | 2-3 sessions |
| 5. Cash Flow | High | 3-4 sessions |
| 6. AI & Automation | High | 4-5 sessions |

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
