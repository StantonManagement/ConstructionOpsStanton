# PRP: Phase 4 — Blocking & Visibility

> Product Requirements Prompt for Windsurf
> Requires Phases 1-3 complete. Read `TASK_MANAGEMENT_INITIAL.md` for business context.

---

## OBJECTIVE

Give leadership visibility into what's blocked and why, so they can take action. By the end of this phase:
- Property dashboard shows rollup stats (X units complete, Y blocked)
- Blocking report groups issues by reason across all properties
- Status filters work across all views
- "What needs attention today?" is answerable in one glance

---

## CONTEXT TO LOAD

| File | Why |
|------|-----|
| `STYLE_AND_DESIGN_SYSTEM.md` | Color = signal philosophy |
| `src/app/components/` | Existing dashboard patterns |
| `src/components/ui/DataTable.tsx` | Table component to use |

---

## THE QUESTIONS TO ANSWER

### Property Dashboard: "How's 31 Park overall?"
- Total locations: 45
- Complete: 12 (27%)
- In Progress: 28 (62%)
- On Hold: 5 (11%)
- Progress bar visualization
- List of blocked items with reasons

### Blocking Report: "What can I unblock today?"
- Group by reason:
  - Materials (8): "Waiting on flooring order #1234"
  - Labor (3): "Need electrician next week"
  - Cash (2): "Awaiting draw approval"
- Click to expand → see affected locations/tasks
- Actions: "Order placed" → unblock

### Trade View: "How's flooring going across all units?"
- Filter by budget category (trade)
- See all flooring tasks across all locations
- Progress: 15/45 complete
- Identify bottlenecks

---

## DATABASE: COMPUTED VIEWS

Create database views for efficient rollup queries:

### `location_stats` (view)
```sql
CREATE VIEW location_stats AS
SELECT 
  l.id as location_id,
  l.property_id,
  l.name,
  l.status,
  l.blocked_reason,
  l.blocked_note,
  COUNT(t.id) as total_tasks,
  COUNT(CASE WHEN t.status = 'verified' THEN 1 END) as verified_tasks,
  COUNT(CASE WHEN t.status = 'worker_complete' THEN 1 END) as pending_verify_tasks,
  COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
  COALESCE(SUM(t.estimated_cost), 0) as total_estimated_cost,
  COALESCE(SUM(CASE WHEN t.status = 'verified' THEN t.actual_cost ELSE 0 END), 0) as verified_cost
FROM locations l
LEFT JOIN tasks t ON t.location_id = l.id
GROUP BY l.id;
```

### `property_stats` (view)
```sql
CREATE VIEW property_stats AS
SELECT
  p.uuid as property_id,
  p.property_name,
  COUNT(DISTINCT l.id) as total_locations,
  COUNT(DISTINCT CASE WHEN ls.verified_tasks = ls.total_tasks AND ls.total_tasks > 0 THEN l.id END) as complete_locations,
  COUNT(DISTINCT CASE WHEN l.status = 'on_hold' THEN l.id END) as blocked_locations,
  SUM(ls.total_tasks) as total_tasks,
  SUM(ls.verified_tasks) as verified_tasks,
  SUM(ls.total_estimated_cost) as total_estimated_cost,
  SUM(ls.verified_cost) as verified_cost
FROM c_properties p
LEFT JOIN locations l ON l.property_id = p.uuid
LEFT JOIN location_stats ls ON ls.location_id = l.id
GROUP BY p.uuid, p.property_name;
```

### `blocking_report` (view)
```sql
CREATE VIEW blocking_report AS
SELECT
  l.blocked_reason,
  l.property_id,
  p.property_name,
  l.id as location_id,
  l.name as location_name,
  l.blocked_note,
  l.updated_at as blocked_since,
  COUNT(t.id) as affected_tasks,
  SUM(t.estimated_cost) as affected_cost
FROM locations l
JOIN c_properties p ON p.uuid = l.property_id
LEFT JOIN tasks t ON t.location_id = l.id
WHERE l.status = 'on_hold' AND l.blocked_reason IS NOT NULL
GROUP BY l.blocked_reason, l.property_id, p.property_name, l.id, l.name, l.blocked_note, l.updated_at
ORDER BY l.blocked_reason, l.updated_at DESC;
```

---

## API ENDPOINTS TO CREATE

### Property Stats: `src/app/api/properties/[id]/stats/route.ts`

| Method | Purpose |
|--------|---------|
| GET | Get property stats (uses property_stats view) |

**Returns:**
```json
{
  "property_id": "...",
  "property_name": "31 Park",
  "total_locations": 45,
  "complete_locations": 12,
  "blocked_locations": 5,
  "total_tasks": 540,
  "verified_tasks": 145,
  "completion_percent": 27,
  "total_estimated_cost": 125000,
  "verified_cost": 33750
}
```

### Blocking Report: `src/app/api/reports/blocking/route.ts`

| Method | Query | Purpose |
|--------|-------|---------|
| GET | `?property_id=xxx` (optional) | Get blocking report |

**Returns:**
```json
{
  "by_reason": {
    "materials": {
      "count": 8,
      "affected_tasks": 45,
      "affected_cost": 12500,
      "items": [
        {
          "location_id": "...",
          "location_name": "Unit 203",
          "property_name": "31 Park",
          "blocked_note": "Waiting on flooring order #1234",
          "blocked_since": "2024-12-15T..."
        }
      ]
    },
    "labor": { ... },
    "cash": { ... }
  },
  "total_blocked": 13,
  "total_affected_cost": 28500
}
```

### Trade Report: `src/app/api/reports/trade/route.ts`

| Method | Query | Purpose |
|--------|-------|---------|
| GET | `?property_id=xxx&budget_category_id=yyy` | Tasks by trade/category |

**Returns:**
```json
{
  "budget_category": "Flooring",
  "total_tasks": 45,
  "verified_tasks": 15,
  "in_progress_tasks": 20,
  "not_started_tasks": 10,
  "total_estimated_cost": 54000,
  "verified_cost": 18000,
  "tasks": [
    {
      "task_id": "...",
      "task_name": "Install LVP",
      "location_name": "Unit 203",
      "status": "in_progress",
      "assigned_contractor": "ABC Flooring"
    }
  ]
}
```

---

## UI COMPONENTS TO CREATE

### Property Dashboard Enhancement

Modify: `src/app/(dashboard)/properties/[id]/page.tsx`

**Add stats section at top:**
```
┌─────────────────────────────────────────────┐
│ 31 Park Street                              │
├─────────────────────────────────────────────┤
│  Units      Tasks       Verified Cost       │
│  12/45      145/540     $33,750 / $125,000  │
│  ████░░░░   ████░░░░░   ████░░░░░░░░        │
│  27%        27%         27%                  │
├─────────────────────────────────────────────┤
│ ⚠️ 5 Blocked Units                          │
│  🏗️ Materials (3)  👷 Labor (2)             │
│  [View Blocking Report →]                   │
└─────────────────────────────────────────────┘
```

### Blocking Report Page

Location: `src/app/(dashboard)/reports/blocking/page.tsx`

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Blocking Report                    [Filter] │
├─────────────────────────────────────────────┤
│ 🏗️ Materials — 8 locations, $12,500        │
├─────────────────────────────────────────────┤
│ │ Unit 203 @ 31 Park                       │
│ │ "Waiting on flooring order #1234"        │
│ │ Blocked 3 days • 6 tasks affected        │
│ │                         [Unblock]        │
│ ├──────────────────────────────────────────┤
│ │ Unit 305 @ 31 Park                       │
│ │ "Cabinets backordered until Jan 5"       │
│ │ Blocked 5 days • 4 tasks affected        │
│ │                         [Unblock]        │
├─────────────────────────────────────────────┤
│ 👷 Labor — 3 locations, $8,500             │
├─────────────────────────────────────────────┤
│ ...                                         │
└─────────────────────────────────────────────┘
```

**Features:**
- Collapsible sections by reason
- Filter by property
- Unblock action opens modal to clear reason/note
- Sort by: newest blocked, highest cost impact

### Trade Progress View

Location: `src/app/(dashboard)/reports/trade/page.tsx`

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Trade Progress             [Property ▾]     │
├─────────────────────────────────────────────┤
│ Budget Category     Complete    Cost        │
├─────────────────────────────────────────────┤
│ Flooring           15/45 33%   $18K/$54K   │
│ ████████░░░░░░░░░░░░░░░░░░░░░              │
├─────────────────────────────────────────────┤
│ Electrical         22/45 49%   $11K/$22K   │
│ █████████████░░░░░░░░░░░░░░░░              │
├─────────────────────────────────────────────┤
│ Plumbing           8/45 18%    $6K/$32K    │
│ █████░░░░░░░░░░░░░░░░░░░░░░░░              │
└─────────────────────────────────────────────┘
```

**Features:**
- Click row → expand to see all tasks for that trade
- Filter by property
- Identify slowest trades at a glance

### Status Filter Component

Location: `src/components/StatusFilter.tsx`

Reusable filter bar for location/task views:
```
[All] [Not Started] [In Progress] [Needs Verify] [Verified] [Blocked]
```

- Toggle buttons, can select multiple
- Persists selection in URL params
- Used on: location list, task list, reports

---

## REACT QUERY HOOKS TO CREATE

### `usePropertyStats.ts`
| Hook | Purpose |
|------|---------|
| `usePropertyStats(propertyId)` | Get stats for property dashboard |

### `useReports.ts`
| Hook | Purpose |
|------|---------|
| `useBlockingReport(propertyId?)` | Get blocking report |
| `useTradeReport(propertyId?, categoryId?)` | Get trade progress |

---

## VALIDATION GATES

### Database Views
```sql
-- Views exist
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public' AND table_name IN ('location_stats', 'property_stats', 'blocking_report');

-- Views return data
SELECT * FROM property_stats LIMIT 1;
SELECT * FROM blocking_report LIMIT 1;
```

### API Endpoints
```bash
# Property stats
curl /api/properties/{id}/stats
→ Returns stats object with all fields

# Blocking report
curl /api/reports/blocking
→ Returns grouped blocking data

# Trade report  
curl /api/reports/trade?budget_category_id=xxx
→ Returns trade progress data
```

### UI
- [ ] Property dashboard shows stats section
- [ ] Stats update when tasks are verified
- [ ] Blocking report loads and groups correctly
- [ ] Unblock action works from report
- [ ] Trade view shows progress bars
- [ ] Status filter works across views

---

## BUSINESS RULES TO ENFORCE

1. **Derived status** — location/property stats are computed, not stored
2. **Complete = all tasks verified** — a location with 0 tasks is NOT complete
3. **Blocked = on_hold with reason** — both must be true
4. **Cost rollup** — only verified tasks count toward verified_cost
5. **Cross-property visibility** — blocking report spans all properties

---

## DO NOT

- ❌ Store computed stats — always calculate from tasks
- ❌ Consider 0-task location as complete — it's not_started
- ❌ Show blocking without reasons — reason is required data
- ❌ Build complex dashboards — keep it simple, answering specific questions
- ❌ Create new chart libraries — use simple progress bars

---

## SUCCESS CRITERIA

- [ ] Property dashboard shows location/task stats
- [ ] Progress percentages are accurate
- [ ] Blocking report groups by reason
- [ ] Can unblock from blocking report
- [ ] Trade view shows progress by budget category
- [ ] Status filter works on all views
- [ ] Stats update in real-time after task changes
- [ ] All reports load in < 2 seconds
