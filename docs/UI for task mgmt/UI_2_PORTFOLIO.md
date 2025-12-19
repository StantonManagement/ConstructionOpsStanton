# PRP: UI Phase 2 — Portfolio Page

> Dashboard stats + property list for portfolio-wide visibility
> Route: `/renovations` (default Renovations landing page)

---

## OBJECTIVE

Answer the question: "How are renovations going across the portfolio?"

This is the first thing Alex or Dean sees when they click into Renovations. Shows:
- High-level stats (units complete, blocked, spend)
- Property list with progress indicators
- Alerts for things needing attention

---

## PAGE LAYOUT

```
┌─────────────────────────────────────────────────────────────────┐
│ Renovations > Portfolio                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────┐ │
│  │ LOCATIONS    │ │ TASKS        │ │ VERIFIED     │ │BLOCKED │ │
│  │ 89/340       │ │ 1,247/4,080  │ │ $487K        │ │ 23     │ │
│  │ complete     │ │ complete     │ │ of $1.2M     │ │        │ │
│  │ ████░░░ 26%  │ │ ████░░░ 31%  │ │ ████░░░ 41%  │ │ [View] │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ ⚠️ 23 Blocked Locations                          [View Report]  │
│   Materials (12) · Labor (6) · Cash (3) · Dependency (2)        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Properties                                    [Filter] [Search] │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 31 Park Street                                              │ │
│ │ SREP Park 1 LLC · 45 units                                  │ │
│ │ Locations: 38/45 ████████████░░░ 84%                        │ │
│ │ Tasks: 456/540 ████████████████░ 84%    Blocked: 3          │ │
│ │ Verified: $89K / $125K                           [View →]   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 10 Wolcott Street                                           │ │
│ │ SREP Park 5 · 140 units                                     │ │
│ │ Locations: 12/140 ██░░░░░░░░░░░░░ 9%                        │ │
│ │ Tasks: 144/1,680 █░░░░░░░░░░░░░░░ 9%    Blocked: 8          │ │
│ │ Verified: $18K / $280K                           [View →]   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ (more properties...)                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## DATA REQUIREMENTS

### Portfolio Stats (top cards)

Use or extend existing `property_stats` view to aggregate across all properties:

```typescript
interface PortfolioStats {
  total_locations: number;
  complete_locations: number;
  total_tasks: number;
  verified_tasks: number;
  total_estimated_cost: number;
  verified_cost: number;
  blocked_locations: number;
  blocked_by_reason: {
    materials: number;
    labor: number;
    cash: number;
    dependency: number;
    other: number;
  };
}
```

### Property List

Use existing `property_stats` view, returns array of:

```typescript
interface PropertyWithStats {
  property_id: string;
  property_name: string;
  entity_name: string;        // SREP Park 1 LLC
  total_locations: number;
  complete_locations: number;
  total_tasks: number;
  verified_tasks: number;
  blocked_locations: number;
  total_estimated_cost: number;
  verified_cost: number;
}
```

---

## API ENDPOINTS

### Portfolio Stats: `GET /api/renovations/portfolio/stats`

Returns aggregated stats across all properties.

**Response:**
```json
{
  "total_locations": 340,
  "complete_locations": 89,
  "total_tasks": 4080,
  "verified_tasks": 1247,
  "total_estimated_cost": 1200000,
  "verified_cost": 487000,
  "blocked_locations": 23,
  "blocked_by_reason": {
    "materials": 12,
    "labor": 6,
    "cash": 3,
    "dependency": 2,
    "other": 0
  }
}
```

### Property List: `GET /api/renovations/portfolio/properties`

Returns list of properties with their renovation stats.

**Query params:**
- `search` — filter by property name
- `sort` — `name`, `progress`, `blocked` (default: `name`)
- `order` — `asc`, `desc`

**Response:**
```json
{
  "properties": [
    {
      "property_id": "...",
      "property_name": "31 Park Street",
      "entity_name": "SREP Park 1 LLC",
      "total_locations": 45,
      "complete_locations": 38,
      "total_tasks": 540,
      "verified_tasks": 456,
      "blocked_locations": 3,
      "total_estimated_cost": 125000,
      "verified_cost": 89000
    }
  ]
}
```

---

## COMPONENTS TO CREATE

### `PortfolioStats.tsx`

Location: `src/components/renovations/PortfolioStats.tsx`

- Four stat cards in a row (responsive: 2x2 on mobile)
- Each card shows: label, value, progress bar, percentage
- Blocked card links to `/renovations/blocking`

### `PortfolioBlockingAlert.tsx`

Location: `src/components/renovations/PortfolioBlockingAlert.tsx`

- Warning banner when blocked_locations > 0
- Shows breakdown by reason
- "View Report" links to `/renovations/blocking`
- Dismissible? Or always visible when there are blocked items?

### `PropertyCard.tsx`

Location: `src/components/renovations/PropertyCard.tsx`

- Property name + entity
- Location progress bar with fraction
- Task progress bar with fraction
- Blocked count (red badge if > 0)
- Verified cost / total cost
- Click → navigates to `/renovations/locations?property={id}`

### `PropertyList.tsx`

Location: `src/components/renovations/PropertyList.tsx`

- Search input
- Sort dropdown
- Grid of PropertyCards
- Loading skeleton
- Empty state (unlikely but handle it)

---

## REACT QUERY HOOKS

### `usePortfolioStats.ts`

```typescript
function usePortfolioStats() {
  return useQuery({
    queryKey: ['portfolio', 'stats'],
    queryFn: () => fetch('/api/renovations/portfolio/stats').then(r => r.json()),
  });
}
```

### `usePortfolioProperties.ts`

```typescript
function usePortfolioProperties(options?: { search?: string; sort?: string }) {
  return useQuery({
    queryKey: ['portfolio', 'properties', options],
    queryFn: () => fetch(`/api/renovations/portfolio/properties?${params}`).then(r => r.json()),
  });
}
```

---

## INTERACTIONS

### Property Card Click
- Navigate to `/renovations/locations?property={property_id}`
- Locations page opens filtered to that property

### Blocked Alert "View Report"
- Navigate to `/renovations/blocking`

### Blocked Card "View"
- Navigate to `/renovations/blocking`

### Search
- Debounced (300ms)
- Filters property list client-side or via API

### Sort
- Options: Name (A-Z), Progress (high-low), Blocked (high-low)
- Persists in URL: `?sort=progress&order=desc`

---

## LOADING STATES

- Stats: 4 skeleton cards
- Property list: 3-4 skeleton cards
- Show stale data while refetching (React Query default)

---

## EMPTY STATES

### No properties with locations
```
No renovation locations yet.
Create locations for a property to get started.
[Go to Locations →]
```

### No blocked items
- Don't show blocking alert at all
- Blocked stat card shows "0" with green checkmark

---

## REFRESH BEHAVIOR

- Auto-refresh stats every 60 seconds (optional, discuss)
- Manual refresh button? Or rely on navigation refetch?

---

## VALIDATION GATES

### API
```bash
# Stats endpoint returns data
curl /api/renovations/portfolio/stats
→ { total_locations: X, ... }

# Properties endpoint returns list
curl /api/renovations/portfolio/properties
→ { properties: [...] }
```

### UI
- [ ] Stats cards render with real data
- [ ] Progress bars are accurate (verified/total)
- [ ] Blocking alert appears when blocked > 0
- [ ] Property cards show correct stats
- [ ] Click property → navigates to locations filtered
- [ ] Search filters property list
- [ ] Sort changes order

### Responsive
- [ ] 4 stat cards → 2x2 grid on mobile
- [ ] Property cards stack vertically on mobile
- [ ] Touch targets 44px minimum

---

## DO NOT

- ❌ Show all locations on this page — that's the Locations page
- ❌ Allow editing from this view — it's read-only dashboard
- ❌ Fetch all tasks to calculate stats — use database views/aggregates
- ❌ Create new card component — extend existing patterns from `ProjectCard`

---

## SUCCESS CRITERIA

- [ ] Portfolio page loads at `/renovations`
- [ ] Stats show accurate aggregated numbers
- [ ] Property list shows all properties with renovation work
- [ ] Blocking alert shows when items are blocked
- [ ] Navigation to Locations and Blocking works
- [ ] Page loads in < 2 seconds
- [ ] Mobile layout works
