# PRP: UI Phase 3 — Locations Page

> Dual-mode location grid: walking a property vs hunting for problems
> Route: `/renovations/locations`

---

## OBJECTIVE

Answer two different questions depending on the day:

**Mode 1 — Walking a property:**
"I'm at 31 Park, show me all units in order so I can go door to door."

**Mode 2 — Hunting for problems:**
"Show me everything that's blocked on materials across the portfolio."

Same page, different filters. Not two separate pages.

---

## PAGE LAYOUT

```
┌─────────────────────────────────────────────────────────────────┐
│ Renovations > Locations                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Property: [All Properties ▾]    Status: [All ▾]             │ │
│ │ Type: [All ▾]   Blocked: [Any ▾]   Search: [___________]    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Showing 340 locations                      [Grid] [List] [Map?] │
│                                                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ Unit 101    │ │ Unit 102    │ │ Unit 103    │ │ Unit 104    │ │
│ │ 31 Park     │ │ 31 Park     │ │ 31 Park     │ │ 31 Park     │ │
│ │ ████████░░  │ │ ██████░░░░  │ │ ░░░░░░░░░░  │ │ ██████████  │ │
│ │ 8/10 tasks  │ │ 6/10 tasks  │ │ 0/10 tasks  │ │ 10/10 ✓     │ │
│ │             │ │ 🔴 BLOCKED  │ │             │ │             │ │
│ │             │ │ Materials   │ │             │ │             │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
│                                                                 │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│ │ Unit 105    │ │ Unit 106    │ │ Hallway 1F  │ │ Parking Lot │ │
│ │ ...         │ │ ...         │ │ 31 Park     │ │ 31 Park     │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
│                                                                 │
│ [Load More] or infinite scroll                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## FILTER BAR

### Property Filter
- Default: "All Properties"
- Dropdown lists all properties with location counts
- Selecting one filters to just that property
- URL: `?property={id}`

### Status Filter
- Options: All, Not Started, In Progress, Complete, On Hold
- Multi-select allowed
- URL: `?status=in_progress,on_hold`

### Type Filter
- Options: All, Unit, Common Area, Exterior, Building Wide
- Single select
- URL: `?type=unit`

### Blocked Filter
- Options: Any, Not Blocked, Materials, Labor, Cash, Dependency, Other
- "Not Blocked" = show only unblocked
- Others = show only that blocking reason
- URL: `?blocked=materials`

### Search
- Searches location name and unit number
- Debounced 300ms
- URL: `?search=203`

### Presets (Quick Filters)
Below the filter bar, show clickable presets:

```
[Needs Attention] [Blocked] [Ready to Verify] [Complete]
```

- **Needs Attention**: status=on_hold OR has tasks in worker_complete
- **Blocked**: blocked IS NOT NULL
- **Ready to Verify**: has tasks in worker_complete status
- **Complete**: status=complete

---

## URL STATE

All filters persist in URL for shareability:

```
/renovations/locations?property=abc&status=in_progress&blocked=materials
```

Coming from Portfolio page with property selected:
```
/renovations/locations?property=abc
```

---

## DATA REQUIREMENTS

### Location List

Extend existing `LocationList` component or create new one.

Each location needs:
```typescript
interface LocationListItem {
  id: string;
  name: string;
  property_id: string;
  property_name: string;
  type: 'unit' | 'common_area' | 'exterior' | 'building_wide';
  unit_number?: string;
  status: 'not_started' | 'in_progress' | 'complete' | 'on_hold';
  blocked_reason?: string;
  blocked_note?: string;
  total_tasks: number;
  verified_tasks: number;
  pending_verify_tasks: number;  // worker_complete status
  sort_key: string;  // for ordering (unit_number or name)
}
```

### API: `GET /api/renovations/locations`

**Query params:**
- `property_id` — filter to one property
- `status` — comma-separated list
- `type` — single value
- `blocked` — blocking reason or "none"
- `search` — text search
- `limit` — pagination (default 50)
- `offset` — pagination

**Response:**
```json
{
  "locations": [...],
  "total": 340,
  "limit": 50,
  "offset": 0
}
```

---

## COMPONENTS

### Existing: `LocationCard.tsx`

Already built in Phase 1. Uses border-left color pattern:
- Red = Blocked
- Green = Complete
- Blue = In Progress
- Gray = Not Started

**Enhancements needed:**
- Show property name (when viewing all properties)
- Show "Ready to Verify" badge when pending_verify_tasks > 0
- Click → navigate to location detail (punch list)

### Existing: `LocationList.tsx`

Already built. Needs:
- Integration with new filter bar
- URL state management
- Pagination or infinite scroll

### New: `LocationFilterBar.tsx`

Location: `src/components/renovations/LocationFilterBar.tsx`

- All filter dropdowns
- Search input
- Preset quick-filter buttons
- Reads/writes URL params

### New: `LocationViewToggle.tsx`

Toggle between:
- **Grid**: Cards in responsive grid (default)
- **List**: Compact table view (more items visible)
- **Map**: Future — show on floor plan (placeholder)

---

## INTERACTIONS

### Card Click
- Navigate to `/renovations/locations/{id}`
- This is the punch list / task detail page (Dean's verification tool)

### Filter Change
- Update URL params
- Refetch with new filters
- Maintain scroll position if possible

### Preset Click
- Sets appropriate filters
- Clears other filters
- Example: "Blocked" sets `?blocked=materials,labor,cash,dependency,other`

### Property Card "View" (from Portfolio)
- Navigates here with `?property={id}`
- Shows that property's locations pre-filtered

---

## SORTING

Default sort order:
1. If property selected: by unit_number/name ascending (walking order)
2. If all properties: by property_name, then unit_number

User can change:
- Name (A-Z)
- Progress (lowest first — needs attention)
- Blocked first

---

## PAGINATION

Two options (pick one):

**Option A: Load More button**
- Initial load: 50 items
- "Load More" appends next 50
- Simpler, works better with filters

**Option B: Infinite scroll**
- Loads more as user scrolls
- Better for "walking" mode
- More complex, can have scroll position issues

**Recommendation:** Start with Load More, add infinite scroll later if needed.

---

## EMPTY STATES

### No locations match filters
```
No locations match your filters.
[Clear Filters]
```

### No locations at all
```
No renovation locations yet.
Add locations to a property to get started.
```

### Property has no locations
```
{Property Name} has no locations yet.
[Add Locations] [Back to All Properties]
```

---

## LOADING STATES

- Initial load: Grid of skeleton cards (8-12)
- Filter change: Show loading overlay, keep existing cards visible
- Load more: Spinner below existing cards

---

## MOBILE LAYOUT

- Filter bar collapses to single row with "Filters" button → opens sheet/modal
- Cards: 1 column on mobile, 2 on tablet, 4 on desktop
- Presets: Horizontal scroll if needed
- Search: Full width at top

---

## VALIDATION GATES

### API
```bash
# Returns locations
curl /api/renovations/locations
→ { locations: [...], total: X }

# Filters work
curl /api/renovations/locations?status=on_hold
→ Only on_hold locations

curl /api/renovations/locations?property_id=abc&blocked=materials
→ Only blocked materials for that property
```

### UI
- [ ] Filter bar renders with all options
- [ ] Changing filter updates URL and list
- [ ] Presets apply correct filters
- [ ] Card click navigates to detail
- [ ] Property filter works
- [ ] Search filters by name/unit number
- [ ] Pagination loads more items
- [ ] Empty states display correctly

### Dual Mode Test
- [ ] **Walking mode**: Select property → see units in order → tap through sequentially
- [ ] **Hunting mode**: Select "Blocked" → see all blocked across portfolio → identify common issues

### Performance
- [ ] Initial load < 2 seconds
- [ ] Filter change < 500ms
- [ ] Works with 400+ locations

---

## DO NOT

- ❌ Load all locations at once — use pagination
- ❌ Create separate pages for different modes — use filters
- ❌ Lose filter state on back button — persist in URL
- ❌ Show task details on this page — that's the detail page
- ❌ Allow editing locations from list — click to detail first

---

## SUCCESS CRITERIA

- [ ] Locations page loads at `/renovations/locations`
- [ ] All filters work correctly
- [ ] URL reflects filter state
- [ ] Coming from Portfolio with property works
- [ ] Presets apply correct filters
- [ ] Cards show accurate task progress
- [ ] Click navigates to location detail
- [ ] Mobile layout works
- [ ] Both "walking" and "hunting" workflows feel natural
