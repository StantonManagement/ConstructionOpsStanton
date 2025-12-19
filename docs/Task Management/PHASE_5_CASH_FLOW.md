# PRP: Phase 5 — Cash Flow Integration

> Product Requirements Prompt for Windsurf
> Requires Phases 1-4 complete. Read `TASK_MANAGEMENT_INITIAL.md` for business context.

---

## OBJECTIVE

Connect task completion to construction loan cash flow. By the end of this phase:
- Forecast: "What cash do we need next week?" based on scheduled work
- Draw eligibility: "What can we draw today?" based on verified work
- Alex can manage construction loan draws without spreadsheets

---

## CONTEXT TO LOAD

| File | Why |
|------|-----|
| `Construction_Financial_Tracking_System__Remaining_Expenditures___Timeline.md` | Existing financial tracking context |
| `HUD_Chart_of_Accounts_for_Property_Management.md` | GL account structure |
| `budget_categories` table | Tasks link to budget categories for cost rollup |

---

## THE TWO CASH FLOW QUESTIONS

### 1. Forecast: "What do we need next week?"

**Data source:** `tasks.scheduled_start` + `tasks.estimated_cost`

**Calculation:**
- Sum estimated_cost of tasks scheduled to start in date range
- Group by week for weekly forecast
- Compare to available cash / loan balance

**Use case:** Alex plans weekly cash needs, coordinates with lender

### 2. Draw Eligibility: "What can we draw now?"

**Data source:** `tasks.status = 'verified'` + `tasks.actual_cost`

**Calculation:**
- Sum actual_cost (or estimated_cost if actual is null) of verified tasks
- Subtract: draws already submitted for this property
- Result: eligible draw amount

**Use case:** Alex submits draw request to lender with verified work backup

---

## DATABASE WORK

### New Table: `construction_draws`

Track draw requests against properties:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `property_id` | UUID | FK to c_properties |
| `draw_number` | INTEGER | Sequential per property |
| `amount_requested` | DECIMAL(12,2) | |
| `amount_approved` | DECIMAL(12,2) | Nullable until approved |
| `status` | ENUM | 'draft', 'submitted', 'approved', 'funded', 'rejected' |
| `submitted_at` | TIMESTAMPTZ | Nullable |
| `approved_at` | TIMESTAMPTZ | Nullable |
| `funded_at` | TIMESTAMPTZ | Nullable |
| `notes` | TEXT | |
| `tenant_id` | UUID | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### New Table: `draw_line_items`

Link draws to verified tasks:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `draw_id` | UUID | FK to construction_draws (CASCADE) |
| `task_id` | UUID | FK to tasks |
| `budget_category_id` | UUID | FK to budget_categories |
| `amount` | DECIMAL(10,2) | Amount for this line item |
| `description` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

**Constraint:** A task can only appear in ONE draw (unique constraint on task_id across all line items)

### Database View: `cash_flow_forecast`

```sql
CREATE VIEW cash_flow_forecast AS
SELECT
  DATE_TRUNC('week', t.scheduled_start) as week_start,
  l.property_id,
  p.property_name,
  bc.name as budget_category,
  COUNT(t.id) as task_count,
  SUM(COALESCE(t.estimated_cost, 0)) as forecasted_cost
FROM tasks t
JOIN locations l ON l.id = t.location_id
JOIN c_properties p ON p.uuid = l.property_id
LEFT JOIN budget_categories bc ON bc.id = t.budget_category_id
WHERE t.scheduled_start IS NOT NULL
  AND t.status != 'verified'
GROUP BY DATE_TRUNC('week', t.scheduled_start), l.property_id, p.property_name, bc.name
ORDER BY week_start, property_name;
```

### Database View: `draw_eligibility`

```sql
CREATE VIEW draw_eligibility AS
SELECT
  l.property_id,
  p.property_name,
  bc.id as budget_category_id,
  bc.name as budget_category,
  COUNT(t.id) as verified_task_count,
  SUM(COALESCE(t.actual_cost, t.estimated_cost, 0)) as verified_cost,
  COALESCE(SUM(dli.amount), 0) as already_drawn,
  SUM(COALESCE(t.actual_cost, t.estimated_cost, 0)) - COALESCE(SUM(dli.amount), 0) as eligible_to_draw
FROM tasks t
JOIN locations l ON l.id = t.location_id
JOIN c_properties p ON p.uuid = l.property_id
LEFT JOIN budget_categories bc ON bc.id = t.budget_category_id
LEFT JOIN draw_line_items dli ON dli.task_id = t.id
WHERE t.status = 'verified'
GROUP BY l.property_id, p.property_name, bc.id, bc.name
HAVING SUM(COALESCE(t.actual_cost, t.estimated_cost, 0)) - COALESCE(SUM(dli.amount), 0) > 0;
```

---

## API ENDPOINTS TO CREATE

### Forecast: `src/app/api/cash-flow/forecast/route.ts`

| Method | Query | Purpose |
|--------|-------|---------|
| GET | `?property_id=xxx&weeks=4` | Get cash forecast for next N weeks |

**Returns:**
```json
{
  "property_name": "31 Park",
  "weeks": [
    {
      "week_start": "2024-12-23",
      "forecasted_cost": 45000,
      "by_category": [
        { "category": "Flooring", "cost": 18000, "task_count": 15 },
        { "category": "Electrical", "cost": 12000, "task_count": 22 }
      ]
    },
    { "week_start": "2024-12-30", "forecasted_cost": 32000, ... }
  ],
  "total_forecast": 77000
}
```

### Draw Eligibility: `src/app/api/cash-flow/draw-eligibility/route.ts`

| Method | Query | Purpose |
|--------|-------|---------|
| GET | `?property_id=xxx` | Get current draw eligibility |

**Returns:**
```json
{
  "property_name": "31 Park",
  "total_verified_cost": 125000,
  "total_already_drawn": 75000,
  "total_eligible": 50000,
  "by_category": [
    {
      "category": "Flooring",
      "verified_cost": 45000,
      "already_drawn": 30000,
      "eligible": 15000,
      "verified_task_count": 35
    }
  ],
  "eligible_tasks": [
    {
      "task_id": "...",
      "task_name": "Install LVP - Unit 203",
      "location_name": "Unit 203",
      "cost": 1200,
      "verified_at": "2024-12-15T..."
    }
  ]
}
```

### Draws CRUD: `src/app/api/draws/route.ts`

| Method | Purpose |
|--------|---------|
| GET | List draws for property |
| POST | Create new draw (draft status) |

### Draw by ID: `src/app/api/draws/[id]/route.ts`

| Method | Purpose |
|--------|---------|
| GET | Get draw with line items |
| PUT | Update draw (status transitions, amounts) |
| DELETE | Delete draft draw only |

### Draw Line Items: `src/app/api/draws/[id]/line-items/route.ts`

| Method | Purpose |
|--------|---------|
| GET | List line items for draw |
| POST | Add tasks to draw |
| DELETE | Remove task from draw |

### Submit Draw: `src/app/api/draws/[id]/submit/route.ts`

| Method | Purpose |
|--------|---------|
| POST | Transition draw from draft to submitted |

**Validation:**
- Draw must have at least one line item
- All tasks must still be verified
- Total amount must match sum of line items

---

## UI COMPONENTS TO CREATE

### Cash Flow Dashboard

Location: `src/app/(dashboard)/cash-flow/page.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Cash Flow                        [Property ▾]       │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────────┐ │
│ │ FORECAST            │ │ DRAW ELIGIBILITY        │ │
│ │ Next 4 weeks        │ │ Ready to draw           │ │
│ │                     │ │                         │ │
│ │ $77,000             │ │ $50,000                 │ │
│ │ [View Details →]    │ │ [Create Draw →]         │ │
│ └─────────────────────┘ └─────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ UPCOMING WEEKS                                      │
├─────────────────────────────────────────────────────┤
│ Dec 23-29    $45,000    ████████████░░░░░          │
│ Dec 30-Jan 5 $32,000    ████████░░░░░░░░           │
│ Jan 6-12     $28,000    ███████░░░░░░░░░           │
├─────────────────────────────────────────────────────┤
│ RECENT DRAWS                                        │
├─────────────────────────────────────────────────────┤
│ Draw #3  $35,000  Funded Dec 10                    │
│ Draw #2  $40,000  Funded Nov 28                    │
└─────────────────────────────────────────────────────┘
```

### Forecast Detail Page

Location: `src/app/(dashboard)/cash-flow/forecast/page.tsx`

**Features:**
- Week-by-week breakdown
- Drill down to see tasks scheduled that week
- Filter by budget category
- Adjust scheduled dates inline (updates forecast)

### Draw Creation Flow

Location: `src/app/(dashboard)/draws/new/page.tsx`

**Flow:**
1. Select property
2. Show eligible tasks (grouped by category)
3. Check tasks to include in draw
4. Review total amount
5. Add notes
6. Save as draft OR submit

### Draw Detail Page

Location: `src/app/(dashboard)/draws/[id]/page.tsx`

**Features:**
- Draw header: number, status, amounts
- Line items table with task details
- Status timeline: Draft → Submitted → Approved → Funded
- Actions based on status:
  - Draft: Edit, Delete, Submit
  - Submitted: (view only)
  - Approved: Mark Funded

---

## REACT QUERY HOOKS TO CREATE

### `useCashFlow.ts`

| Hook | Purpose |
|------|---------|
| `useForecast(propertyId, weeks)` | Get cash forecast |
| `useDrawEligibility(propertyId)` | Get draw eligibility |

### `useDraws.ts`

| Hook | Purpose |
|------|---------|
| `useDraws(propertyId)` | List draws for property |
| `useDraw(id)` | Get single draw with line items |
| `useCreateDraw()` | Create draft draw |
| `useUpdateDraw()` | Update draw |
| `useSubmitDraw()` | Submit draw |
| `useAddDrawLineItems()` | Add tasks to draw |
| `useRemoveDrawLineItem()` | Remove task from draw |

---

## VALIDATION GATES

### Database
```sql
-- Tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('construction_draws', 'draw_line_items');

-- Views exist
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public' AND table_name IN ('cash_flow_forecast', 'draw_eligibility');

-- Task can only be in one draw
-- This should fail:
INSERT INTO draw_line_items (draw_id, task_id, amount) VALUES ('draw-1', 'task-1', 100);
INSERT INTO draw_line_items (draw_id, task_id, amount) VALUES ('draw-2', 'task-1', 100);
-- Error: duplicate key
```

### API
```bash
# Forecast returns data
curl /api/cash-flow/forecast?property_id=xxx&weeks=4
→ Returns weeks array with costs

# Draw eligibility shows tasks
curl /api/cash-flow/draw-eligibility?property_id=xxx
→ Returns eligible_tasks array

# Cannot add unverified task to draw
curl -X POST /api/draws/{id}/line-items -d '{"task_id":"unverified-task"}'
→ 400 { "error": "Task must be verified" }

# Cannot add same task to two draws
→ 400 { "error": "Task already in another draw" }
```

### Functional
- [ ] Forecast updates when task scheduled_start changes
- [ ] Draw eligibility updates when task is verified
- [ ] Draw eligibility decreases when draw is submitted
- [ ] Can create draw, add tasks, submit
- [ ] Draw status transitions work correctly

---

## BUSINESS RULES TO ENFORCE

1. **Only verified tasks can be drawn** — API must validate
2. **Task can only be in ONE draw** — database constraint
3. **Draw cannot be modified after submitted** — only draft is editable
4. **Use actual_cost if available, else estimated_cost** — for draw amounts
5. **Forecast only includes unverified tasks** — verified work is history
6. **Draw amounts must match line item sum** — validate on submit

---

## DO NOT

- ❌ Allow unverified tasks in draws — enforce in API
- ❌ Allow task in multiple draws — database constraint
- ❌ Allow editing submitted draws — status gates editing
- ❌ Show forecast for verified tasks — they're done
- ❌ Create complex financial reports — keep it simple: forecast + eligibility
- ❌ Integrate with external accounting yet — that's future work

---

## SUCCESS CRITERIA

- [ ] Forecast shows next 4 weeks of scheduled costs
- [ ] Forecast updates when tasks are rescheduled
- [ ] Draw eligibility shows verified task costs
- [ ] Draw eligibility excludes tasks already in draws
- [ ] Can create draw from eligible tasks
- [ ] Draw status transitions work: draft → submitted → approved → funded
- [ ] Task can only appear in one draw (enforced)
- [ ] Alex can answer "what can we draw?" in under 30 seconds
