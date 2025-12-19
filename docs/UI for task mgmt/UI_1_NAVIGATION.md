# PRP: UI Phase 1 — Navigation Restructure

> Reorganize existing components into the "Renovations" nav section
> Reference: Implementation Report shows features scattered across tabs and routes

---

## OBJECTIVE

Create a dedicated "Renovations" section in the main navigation that consolidates all task management features. This is portfolio-wide visibility, separate from project-specific views.

**Current state:** Features are fragmented:
- `?tab=templates` on dashboard
- `/reports/blocking` standalone
- `/reports/trade` standalone
- Cash flow in project detail subtab
- Locations in... unclear

**Target state:**
```
Construction Ops
├── Overview
├── All Projects
├── Current Project ▾
│   └── (existing: Summary, Budget, Schedule, etc.)
│
├── ─────────────────
├── Renovations           ← NEW SECTION
│   ├── Portfolio         ← Dashboard + property list
│   ├── Locations         ← Unit grid (filterable)
│   ├── Templates         ← Scope templates
│   ├── Blocking          ← Portfolio-wide blocking report
│   └── Draws             ← Construction loan draws
```

---

## EXISTING COMPONENTS TO RELOCATE

| Component/Route | Current Location | New Location |
|-----------------|------------------|--------------|
| `TemplatesView.tsx` | `?tab=templates` | `/renovations/templates` |
| `BlockingReportPage` | `/reports/blocking` | `/renovations/blocking` |
| `TradeReportPage` | `/reports/trade` | Keep as utility, link from Locations |
| `LocationList.tsx` | Unclear | `/renovations/locations` |
| Cash flow view | Project subtab | `/renovations/draws` (enhanced) |

---

## NAVIGATION IMPLEMENTATION

### Sidebar Addition

Location: Modify `src/components/Sidebar.tsx` (or equivalent nav component)

Add new section after "Current Project":

```
Section divider: ─────────────────

Renovations (collapsible)
  ├── Portfolio      → /renovations
  ├── Locations      → /renovations/locations  
  ├── Templates      → /renovations/templates
  ├── Blocking       → /renovations/blocking
  └── Draws          → /renovations/draws
```

**Icon suggestions:**
- Renovations section: `Hammer` or `Building2` from lucide-react
- Portfolio: `LayoutDashboard`
- Locations: `MapPin` or `Grid`
- Templates: `FileText` or `Copy`
- Blocking: `AlertTriangle`
- Draws: `DollarSign` or `Receipt`

### Route Structure

Create new route group: `src/app/(dashboard)/renovations/`

```
src/app/(dashboard)/renovations/
├── page.tsx              → Portfolio (default)
├── locations/
│   └── page.tsx          → Locations grid
├── templates/
│   └── page.tsx          → Templates management
├── blocking/
│   └── page.tsx          → Blocking report
└── draws/
    ├── page.tsx          → Draws list + eligibility
    └── [id]/
        └── page.tsx      → Draw detail
```

---

## MIGRATION STEPS

### Step 1: Create route group
- Create `/renovations` folder structure
- Set up layout with consistent header/breadcrumbs

### Step 2: Move Templates
- Extract `TemplatesView.tsx` logic from dashboard tabs
- Create `/renovations/templates/page.tsx` that renders it
- Remove from `?tab=templates` handling

### Step 3: Move Blocking Report
- Move or re-export `BlockingReportPage` to `/renovations/blocking`
- Keep `/reports/blocking` as redirect for any existing links
- Update any hardcoded links

### Step 4: Create placeholder pages
- Portfolio: placeholder with "Coming in UI_2"
- Locations: placeholder with "Coming in UI_3"  
- Draws: placeholder with "Coming in UI_4"

### Step 5: Update sidebar
- Add Renovations section
- Ensure active state highlights correctly
- Test navigation flow

---

## BREADCRUMB PATTERN

All Renovations pages should show:
```
Renovations > [Current Page]
```

Example: `Renovations > Blocking`

If drilling into detail:
```
Renovations > Draws > Draw #3
```

---

## BACK BUTTON BEHAVIOR

**Problem identified:** Mix of `?tab=` params and standalone routes breaks back button.

**Solution:** 
- Renovations section uses ONLY route-based navigation (no query params for main views)
- Store "return to" context in URL when drilling in: `/renovations/draws/123?from=locations`
- Back button reads `from` param, defaults to parent route if missing

---

## VALIDATION GATES

### Routes exist
```bash
# All routes respond with 200
curl /renovations → 200
curl /renovations/locations → 200
curl /renovations/templates → 200
curl /renovations/blocking → 200
curl /renovations/draws → 200
```

### Navigation works
- [ ] Renovations section appears in sidebar
- [ ] All 5 links navigate correctly
- [ ] Active state shows on current page
- [ ] Section collapses/expands (if implemented)

### Back button
- [ ] Browser back from `/renovations/blocking` returns to previous page
- [ ] No state loss when navigating between Renovations pages

### Mobile nav
- [ ] Renovations accessible on mobile (hamburger menu or bottom tabs)
- [ ] Touch targets are 44px minimum

---

## DO NOT

- ❌ Use query params (`?tab=`) for main Renovations pages — use routes
- ❌ Break existing `/reports/blocking` links — redirect them
- ❌ Create new nav component — extend existing sidebar
- ❌ Nest Renovations under Current Project — it's portfolio-wide

---

## SUCCESS CRITERIA

- [ ] Renovations section visible in nav
- [ ] 5 child routes accessible
- [ ] Templates page works (migrated from tabs)
- [ ] Blocking report works (migrated from /reports)
- [ ] Placeholder pages exist for Portfolio, Locations, Draws
- [ ] Back button works consistently
- [ ] No broken links to old routes
