# Task Management UI — Progress Tracker

This file is a living checklist for completing the UI phases in `docs/UI for task mgmt/`.

Update this file as changes land in the codebase.

---

## Legend

- [ ] Not started
- [~] In progress
- [x] Done

---

## UI_1 — Navigation Restructure (`UI_1_NAVIGATION.md`)

- [x] Renovations section exists in navigation
  - **Routes**
    - `/renovations`
    - `/renovations/locations`
    - `/renovations/templates`
    - `/renovations/blocking`
    - `/renovations/draws`
- [x] Old links preserved via redirects/aliases where needed
  - `/locations/[id]` -> `/renovations/locations/[id]`
- [x] Deterministic `returnTo` / back navigation (avoid nested `returnTo`)

**Notes**
- Navigation `returnTo` stripping implemented in components (e.g. `src/app/components/Navigation.tsx`).

---

## UI_2 — Portfolio (`UI_2_PORTFOLIO.md`)

- [x] Portfolio landing page UX polish
- [x] Stats/cards align with Phase 4 rollups
- [x] Portfolio stats API aggregates from project_stats view
- [x] Property list with search and sorting
- [x] Blocking alert with reason breakdown

**Related**
- `src/app/renovations/page.tsx`
- `src/app/renovations/components/PortfolioStats.tsx`
- `src/app/renovations/components/PropertyList.tsx`
- `src/app/renovations/components/PropertyCard.tsx`
- `src/app/renovations/components/PortfolioBlockingAlert.tsx`
- `src/app/api/renovations/portfolio/stats/route.ts`
- `src/app/api/renovations/portfolio/properties/route.ts`
- `src/hooks/queries/usePortfolio.ts`

---

## UI_3 — Locations (`UI_3_LOCATIONS.md`)

- [x] Locations grid responsive
  - 1 column on phones
  - 2 columns on tablet
- [x] Location detail header includes property context
- [x] Block/unblock flow functional on location detail
- [x] Locations filter bar per spec (collapse/URL state/presets)
  - [x] Property, status, type, blocked filters
  - [x] Mobile filter sheet with bottom drawer
  - [x] Quick filter presets (Needs Attention, Blocked, Ready to Verify, Complete)
  - [x] URL state persistence for all filters
- [x] LocationCard enhancements
  - [x] Show property name when viewing all properties
  - [x] "Ready to Verify" badge when `pending_verify_tasks > 0`
  - [x] Border color coding (red=blocked, green=complete, blue=in progress)
- [x] Pagination with "Load More" pattern
- [x] Grid/List view toggle

**Related**
- `src/app/renovations/locations/page.tsx`
- `src/app/renovations/locations/[id]/page.tsx`
- `src/app/renovations/components/LocationFilterBar.tsx`
- `src/app/renovations/components/LocationCard.tsx`
- `src/app/renovations/components/RenovationLocationList.tsx`
- `src/app/renovations/components/MobileFilterSheet.tsx`
- `src/app/api/renovations/locations/route.ts`
- `src/hooks/queries/useRenovationLocations.ts`

---

## UI_4 — Draws (`UI_4_DRAWS.md`)

- [x] Draws list + eligibility on `/renovations/draws`
  - [x] Eligibility and pending draws stat cards
  - [x] Draw list with status badges
- [x] "View Eligibility Details" navigation from Cash Flow dashboard
- [x] Draw eligibility details page exists
  - `/cash-flow/draw-eligibility`
- [x] Draw list filtering (property/status)
  - [x] Property dropdown filter
  - [x] Status filter (draft/submitted/approved/funded)
  - [x] URL state persistence
- [x] Draw detail page actions by status (draft/submitted/approved/funded)
  - [x] Draft: Edit, Delete, Submit
  - [x] Submitted: Approve
  - [x] Approved: Mark as Funded
  - [x] Funded: Read-only
  - [x] Status timeline visualization
- [x] Create draw flow matches spec
  - [x] Property selector + grouped eligible tasks by location
  - [x] Checkbox selection (location-level + individual)
  - [x] Running totals of selected amount
  - [x] Notes field
  - [x] Create Draft button

**Related**
- `src/app/renovations/draws/page.tsx`
- `src/app/renovations/draws/new/page.tsx`
- `src/app/renovations/draws/[id]/page.tsx`
- `src/app/renovations/draws/components/DrawStatsCards.tsx`
- `src/app/renovations/draws/components/DrawCard.tsx`
- `src/app/cash-flow/draw-eligibility/page.tsx`
- `src/hooks/queries/useDraws.ts`

---

## UI_5 — Mobile (`UI_5_MOBILE.md`)

- [x] Locations list/grid layout usable on mobile (responsive columns)
  - [x] 1 column on mobile, 2 on tablet, 4 on desktop
- [x] Location detail: touch-target sizing + spacing
  - [x] MobileTaskRow component with 48px+ touch targets
  - [x] Expandable task rows
  - [x] Large verify buttons for pending tasks
- [x] Photo verification UX polish
  - [x] Full-screen camera modal
  - [x] AI confidence feedback
  - [x] Retake/Confirm actions
- [x] Mobile filter bottom sheet pattern
  - [x] MobileFilterSheet component
  - [x] Collapsible filters on mobile
  - [x] Property dropdown + filter button + search toggle
- [x] Responsive layouts across all pages
  - [x] Portfolio stats: 2x2 grid on mobile
  - [x] Property cards: stack vertically
  - [x] Draw creation: stacked columns on mobile

---

## Running Change Log

### 2025-01-19 - UI Polish Complete
- **UI_1 (Navigation)**: Verified complete - Renovations section exists with all routes.
- **UI_2 (Portfolio)**: Fully implemented and polished.
  - Portfolio stats API aggregates from `project_stats` view.
  - Property list with search, sort (name/progress/blocked), and URL state.
  - PortfolioStats component with 4 stat cards and progress bars.
  - PropertyCard component with location/task progress visualization.
  - PortfolioBlockingAlert component with reason breakdown.
- **UI_3 (Locations)**: Comprehensive filtering and mobile support.
  - LocationFilterBar with property, status, type, blocked filters.
  - MobileFilterSheet for mobile bottom drawer pattern.
  - Quick filter presets (Needs Attention, Blocked, Ready to Verify, Complete).
  - LocationCard shows property name, ready-to-verify badge, border color coding.
  - Grid/List view toggle.
  - "Load More" pagination pattern.
  - All filters persist in URL for shareability.
- **UI_4 (Draws)**: Complete draw management workflow.
  - Draws list page with eligibility/pending stats cards.
  - Property and status filtering with URL state.
  - Create draw flow with task selection by location.
  - Draw detail page with status timeline and line items grouped by category.
  - Status-based actions (Draft→Submit, Submitted→Approve, Approved→Fund).
  - Delete draft functionality.
- **UI_5 (Mobile)**: Mobile-first optimizations throughout.
  - Responsive grid layouts (1/2/4 columns).
  - MobileTaskRow with 48px+ touch targets.
  - MobileFilterSheet for collapsible filters.
  - Full-screen photo verification modal.
  - Stacked layouts on mobile for all pages.

### 2025-12-19
- Added `/cash-flow/draw-eligibility` details page.
- Fixed deterministic `returnTo` behavior in cash flow navigation.
- Converted remaining project/entity client calls to `authFetch` where appropriate.
