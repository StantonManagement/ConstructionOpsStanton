# PRP: UI Phase 5 — Mobile & Field Experience

> Optimizations for Dean using the app on-site
> Not a new page — enhancements across existing pages

---

## OBJECTIVE

Dean is on a construction site with:
- iPhone in one hand
- Sometimes wearing gloves
- Noisy environment, can't focus on small details
- Cell network, not always fast
- Needs to move through 20+ units per day

The app must work for him, not against him.

---

## PRIORITY PAGES FOR DEAN

1. **Location Detail (Punch List)** — 80% of his time
2. **Locations Grid** — finding what to work on
3. **Photo Verification Modal** — already well-built per report

Portfolio, Draws, Templates — Alex's domain, desktop-first is fine.

---

## LOCATION DETAIL (PUNCH LIST) — MOBILE OPTIMIZATION

Route: `/renovations/locations/[id]`

This is Dean's daily driver. Needs to be fast, clear, and thumb-friendly.

### Layout — Mobile

```
┌─────────────────────────────┐
│ ← Back         Unit 203     │  Fixed header
├─────────────────────────────┤
│ 31 Park Street              │  Property context
│ 8/12 Tasks  ████████░░░ 67% │  Progress summary
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │ ○ Paint Bathroom        │ │  Task row - full width
│ │   Not Started           │ │  Large touch target
│ │                    [→]  │ │  Chevron indicates expandable
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ ◐ Install Flooring      │ │  Half-filled = in progress
│ │   In Progress           │ │
│ │                    [→]  │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ ⚠️ Replace Fixtures     │ │  Warning icon = needs verify
│ │   Ready to Verify       │ │  Orange/yellow
│ │   [📷 VERIFY]           │ │  BIG verify button
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ ✓ Demo Old Cabinets     │ │  Green check = done
│ │   Verified · 2h ago     │ │
│ │                    [→]  │ │
│ └─────────────────────────┘ │
│                             │
│ (scroll for more)           │
│                             │
├─────────────────────────────┤
│  [Mark All Complete]  [Block Location]  │  Sticky footer
└─────────────────────────────┘
```

### Task Row Behavior

**Tap row** → Expand inline to show:
- Description
- Assigned contractor
- Estimated cost
- Action buttons

**Expanded state:**
```
┌─────────────────────────────┐
│ ◐ Install Flooring          │
│   In Progress               │
├─────────────────────────────┤
│ Assigned: ABC Flooring      │
│ Est. Cost: $1,200           │
│ Started: Dec 15             │
├─────────────────────────────┤
│ [Mark Complete]    [Block]  │  Action buttons
└─────────────────────────────┘
```

**"Ready to Verify" tasks** — show big verify button without expanding:
```
┌─────────────────────────────┐
│ ⚠️ Replace Fixtures         │
│   Ready to Verify           │
│                             │
│   ┌─────────────────────┐   │
│   │   📷 VERIFY NOW     │   │  BIG button, easy to tap
│   └─────────────────────┘   │
└─────────────────────────────┘
```

### Touch Targets

- **Minimum 48px height** for task rows (not just 44px — gloves)
- **Verify button: 56px height**, full width minus padding
- **Spacing between rows: 8px** minimum
- **Swipe gestures**: Optional enhancement
  - Swipe right → Start task (if not_started)
  - Swipe left → Mark complete (if in_progress)

### Sticky Footer

Always visible at bottom:
- **"Mark All Complete"** — batch action for tasks that are in_progress
- **"Block Location"** — quick access to blocking flow

---

## LOCATIONS GRID — MOBILE OPTIMIZATION

Route: `/renovations/locations`

### Filter Collapse

On mobile, full filter bar is too much. Collapse to:

```
┌─────────────────────────────┐
│ [31 Park Street ▾]  [Filters 2]  [🔍]  │
└─────────────────────────────┘
```

- Property dropdown: always visible (most common filter)
- "Filters" button: opens bottom sheet with all other filters
- Badge shows active filter count
- Search icon: expands to search input

### Filter Bottom Sheet

```
┌─────────────────────────────┐
│ Filters                  [✕]│
├─────────────────────────────┤
│                             │
│ Status                      │
│ [All] [In Progress] [Blocked] [Complete]  │
│                             │
│ Type                        │
│ [All] [Unit] [Common] [Exterior]  │
│                             │
│ Blocked Reason              │
│ [Any] [Materials] [Labor] [Cash]  │
│                             │
│ ─────────────────────────── │
│                             │
│ PRESETS                     │
│ [Needs Attention]           │
│ [Ready to Verify]           │
│ [Blocked]                   │
│                             │
├─────────────────────────────┤
│ [Clear All]    [Apply (23)] │
└─────────────────────────────┘
```

### Card Layout

- **1 column on phone** (< 640px)
- **2 columns on tablet** (640-1024px)
- Cards show essential info only:
  - Location name
  - Progress bar
  - Blocked badge (if applicable)
  - Task count

---

## PHOTO VERIFICATION — ENHANCEMENTS

Already well-built per report. Minor enhancements:

### Camera Viewfinder

- **Full screen on mobile** — no distracting chrome
- **Shutter button: 72px** — big, centered at bottom
- **Flash toggle** — top corner (construction sites can be dark)
- **Switch camera** — top corner (front/back)

### After Capture

```
┌─────────────────────────────┐
│                             │
│                             │
│      [Photo Preview]        │
│                             │
│                             │
├─────────────────────────────┤
│ AI: 87% confident           │  AI feedback
│ "Shows completed flooring"  │
├─────────────────────────────┤
│                             │
│ Notes (optional)            │
│ ┌─────────────────────────┐ │
│ │ Type notes here...      │ │
│ └─────────────────────────┘ │
│                             │
│ [Retake]         [Confirm]  │  Equal size buttons
│                             │
└─────────────────────────────┘
```

### Low Confidence Warning

If AI confidence < 70%:

```
┌─────────────────────────────┐
│ ⚠️ Photo may be unclear     │
│                             │
│ The image appears blurry    │
│ or may not show the work.   │
│                             │
│ [Retake Photo]              │  Primary action
│ [Verify Anyway]             │  Secondary, muted
└─────────────────────────────┘
```

---

## OFFLINE CONSIDERATIONS

Construction sites have spotty cell service. Handle gracefully:

### Optimistic UI
- Show success immediately on task status change
- Queue API call
- If fails, show retry option (don't lose data)

### Photo Upload
- Store photo locally if upload fails
- Show "Uploading..." with retry
- Don't block user from continuing
- Background upload when connection returns

### Stale Data Indicator

If data is > 5 minutes old:
```
┌─────────────────────────────┐
│ ↻ Updated 8 min ago  [Refresh]  │
└─────────────────────────────┘
```

---

## NAVIGATION — MOBILE

### Bottom Tab Bar (if on Renovations section)

```
┌─────────────────────────────┐
│ [Portfolio] [Locations] [Draws] [More]  │
└─────────────────────────────┘
```

- Active tab highlighted
- "More" opens: Templates, Blocking Report, Settings

### Back Button

- Always visible in header
- Returns to previous page in Renovations flow
- If deep-linked, returns to Locations list

### Quick Jump

On Location Detail, add "Next/Previous" navigation:

```
┌─────────────────────────────┐
│ ← Unit 202    Unit 203    Unit 204 →  │
└─────────────────────────────┘
```

Allows Dean to walk through units sequentially without going back to list.

---

## PERFORMANCE REQUIREMENTS

| Metric | Target |
|--------|--------|
| Location list load | < 2 seconds on 3G |
| Task list render | < 500ms |
| Photo capture to preview | < 1 second |
| Photo upload start | Immediate (background) |
| Status change feedback | < 200ms (optimistic) |

### Techniques
- React Query caching
- Skeleton loaders (not spinners)
- Image compression before upload
- Lazy load non-critical data

---

## VALIDATION GATES

### Touch Targets
- [ ] All interactive elements ≥ 48px height
- [ ] Verify button ≥ 56px height
- [ ] Adequate spacing between tap targets

### Responsive
- [ ] Location list: 1 column on phone
- [ ] Filters collapse to bottom sheet
- [ ] Photo modal is full-screen

### Offline
- [ ] Task status change works offline (queued)
- [ ] Photo stored locally if upload fails
- [ ] Stale data indicator shows

### Performance
- [ ] Location list loads in < 2s on 3G throttle
- [ ] No jank when scrolling task list
- [ ] Camera opens in < 1s

### Navigation
- [ ] Back button works throughout
- [ ] Next/Previous unit navigation works
- [ ] Bottom tabs work (if implemented)

---

## DO NOT

- ❌ Use hover states as primary interaction — no hover on mobile
- ❌ Require pinch-zoom to read content
- ❌ Block UI while uploading photos
- ❌ Show desktop filter bar on mobile
- ❌ Use small text (< 14px body, < 12px labels)
- ❌ Rely on swipe gestures only — always have tap alternative

---

## SUCCESS CRITERIA

- [ ] Dean can verify 20 tasks in 10 minutes
- [ ] Works with gloves (big touch targets)
- [ ] Works on spotty cell signal
- [ ] Photo capture is fast and reliable
- [ ] Navigation between units is fluid
- [ ] No squinting at small text
- [ ] Doesn't drain battery excessively
