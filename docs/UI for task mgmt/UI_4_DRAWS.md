# PRP: UI Phase 4 — Draws Page

> Construction loan draw management: eligibility, creation, tracking
> Route: `/renovations/draws`

---

## OBJECTIVE

Answer the questions:
- "What can we draw right now based on verified work?"
- "What draws are pending with the lender?"
- "What's been funded already?"

This is critical for cash flow — draws fund contractor payments.

---

## PAGE LAYOUT — DRAWS LIST

```
┌─────────────────────────────────────────────────────────────────┐
│ Renovations > Draws                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────┐ ┌─────────────────────────────┐ │
│ │ ELIGIBLE TO DRAW            │ │ PENDING DRAWS               │ │
│ │                             │ │                             │ │
│ │ $147,500                    │ │ $35,000                     │ │
│ │ from 89 verified tasks      │ │ 1 draw awaiting approval    │ │
│ │                             │ │                             │ │
│ │ [Create Draw →]             │ │ [View →]                    │ │
│ └─────────────────────────────┘ └─────────────────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ Property: [All Properties ▾]                     [+ New Draw]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ DRAWS                                                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Draw #4 — 31 Park Street                          DRAFT     │ │
│ │ $52,000 · 34 tasks · Created Dec 18                         │ │
│ │                                      [Edit] [Submit] [Delete]│ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Draw #3 — 31 Park Street                          SUBMITTED │ │
│ │ $35,000 · 28 tasks · Submitted Dec 15                       │ │
│ │                                              [View Details] │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Draw #2 — 31 Park Street                          FUNDED    │ │
│ │ $40,000 · 32 tasks · Funded Dec 10                          │ │
│ │                                              [View Details] │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Draw #1 — 31 Park Street                          FUNDED    │ │
│ │ $28,000 · 22 tasks · Funded Nov 28                          │ │
│ │                                              [View Details] │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## DRAW STATUS FLOW

```
DRAFT → SUBMITTED → APPROVED → FUNDED
                 ↘ REJECTED (can revise)
```

**Status colors:**
- Draft: Gray
- Submitted: Blue
- Approved: Orange/Yellow
- Funded: Green
- Rejected: Red

**Status rules:**
- Draft: Can edit, delete, submit
- Submitted: View only (waiting on lender)
- Approved: Can mark as funded
- Funded: Immutable, historical record
- Rejected: Can view notes, create revised draw

---

## PAGE LAYOUT — CREATE/EDIT DRAW

```
┌─────────────────────────────────────────────────────────────────┐
│ Renovations > Draws > New Draw                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Property: [31 Park Street ▾]                                    │
│                                                                 │
│ ELIGIBLE TASKS                              Selected: $52,000   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Select All]                                                │ │
│ │                                                             │ │
│ │ ☑ FLOORING                                         $18,500  │ │
│ │   ☑ Install LVP - Unit 101              $1,200              │ │
│ │   ☑ Install LVP - Unit 102              $1,200              │ │
│ │   ☑ Install LVP - Unit 103              $1,200              │ │
│ │   ... (15 more)                                             │ │
│ │                                                             │ │
│ │ ☑ ELECTRICAL                                       $12,000  │ │
│ │   ☑ Rough-in - Unit 101                 $800                │ │
│ │   ☑ Rough-in - Unit 102                 $800                │ │
│ │   ... (13 more)                                             │ │
│ │                                                             │ │
│ │ ☐ PLUMBING                                         $8,500   │ │
│ │   ☐ Rough-in - Unit 105                 $600                │ │
│ │   ...                                                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Notes:                                                          │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Draw for December work. Includes flooring completion for    │ │
│ │ building 1 units 101-120.                                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                              [Cancel]  [Save Draft]  [Submit]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## PAGE LAYOUT — DRAW DETAIL

```
┌─────────────────────────────────────────────────────────────────┐
│ Renovations > Draws > Draw #3                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Draw #3                                              SUBMITTED  │
│ 31 Park Street · SREP Park 1 LLC                                │
│                                                                 │
│ Amount Requested: $35,000                                       │
│ Tasks Included: 28                                              │
│ Submitted: December 15, 2024                                    │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ TIMELINE                                                        │
│ ● Created      Dec 14, 2:30 PM    by Alex                       │
│ ● Submitted    Dec 15, 9:15 AM    by Alex                       │
│ ○ Approved     —                                                │
│ ○ Funded       —                                                │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ LINE ITEMS BY CATEGORY                                          │
│                                                                 │
│ Flooring                                             $14,400    │
│   Install LVP - Unit 101                   $1,200               │
│   Install LVP - Unit 102                   $1,200               │
│   ... (10 more items)                                           │
│                                                                 │
│ Electrical                                            $9,600    │
│   Rough-in - Unit 101                      $800                 │
│   ... (11 more items)                                           │
│                                                                 │
│ Painting                                             $11,000    │
│   Paint - Unit 101                         $550                 │
│   ... (19 more items)                                           │
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ Notes:                                                          │
│ December flooring and electrical completion for units 101-115.  │
│                                                                 │
│                                                                 │
│ [← Back to Draws]                           [Mark as Approved]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## DATA REQUIREMENTS

### Existing API (Phase 5)

Use existing endpoints:
- `GET /api/cash-flow/draw-eligibility?property_id=xxx`
- `GET /api/draws`
- `POST /api/draws`
- `GET /api/draws/[id]`
- `PUT /api/draws/[id]`
- `POST /api/draws/[id]/submit`

### Portfolio Eligibility: `GET /api/renovations/draws/eligibility`

Aggregate across all properties:

```json
{
  "total_eligible": 147500,
  "total_eligible_tasks": 89,
  "pending_draws_amount": 35000,
  "pending_draws_count": 1,
  "by_property": [
    {
      "property_id": "...",
      "property_name": "31 Park",
      "eligible_amount": 95500,
      "eligible_tasks": 55
    },
    {
      "property_id": "...",
      "property_name": "10 Wolcott",
      "eligible_amount": 52000,
      "eligible_tasks": 34
    }
  ]
}
```

---

## COMPONENTS

### `DrawEligibilityCard.tsx`

Shows total eligible amount + task count.
- "Create Draw" button opens create flow
- Links to property breakdown

### `PendingDrawsCard.tsx`

Shows pending (submitted but not funded) draws.
- Amount + count
- "View" links to filtered draw list

### `DrawList.tsx`

List of draws with status badges.
- Filter by property
- Filter by status (optional)
- Shows actions based on status

### `DrawCard.tsx`

Individual draw in the list.
- Status badge (colored)
- Amount + task count
- Key date (created, submitted, or funded)
- Actions based on status

### `CreateDrawPage.tsx`

Route: `/renovations/draws/new?property={id}`

- Property selector (required)
- Eligible tasks grouped by budget category
- Checkbox selection (category-level + individual)
- Running total of selected amount
- Notes field
- Save Draft / Submit buttons

### `DrawDetailPage.tsx`

Route: `/renovations/draws/[id]`

- Draw header with status
- Timeline of status changes
- Line items grouped by category
- Notes
- Actions based on status

---

## INTERACTIONS

### "Create Draw" from Eligibility Card
1. If single property selected → go to create with property pre-selected
2. If all properties → go to create, must select property first

### Task Selection
- Click category checkbox → selects/deselects all tasks in category
- Individual task checkboxes for granular control
- Running total updates immediately
- Cannot select tasks already in another draw (they won't appear)

### Save Draft
- Creates draw with status=draft
- Returns to draw list
- Can edit later

### Submit
- Validates at least one task selected
- Changes status to submitted
- Records submitted_at timestamp
- Returns to draw list

### Mark as Approved
- Only visible when status=submitted
- Changes status to approved
- Records approved_at timestamp
- Optionally enter approved amount (if different from requested)

### Mark as Funded
- Only visible when status=approved
- Changes status to funded
- Records funded_at timestamp
- Tasks are now "drawn" — won't appear in future eligibility

### Delete Draft
- Only for draft status
- Confirmation modal
- Removes draw, tasks become eligible again

---

## VALIDATION RULES

### Create/Edit
- Must select at least one task
- Must select a property
- Cannot include tasks already in another draw

### Submit
- All selected tasks must still be verified (edge case: task status changed)
- Total must be > 0

### Status Transitions
- Draft → Submitted (only)
- Submitted → Approved or Rejected
- Approved → Funded (only)
- Funded → nothing (immutable)

---

## EMPTY STATES

### No eligible tasks
```
No tasks ready for draw.
Verify completed work to make it eligible.
[Go to Locations →]
```

### No draws yet
```
No draws created yet.
Create your first draw when you have verified work.
[Create Draw →]
```

---

## VALIDATION GATES

### API
```bash
# Eligibility returns data
curl /api/renovations/draws/eligibility
→ { total_eligible: X, ... }

# Can create draft
curl -X POST /api/draws -d '{"property_id":"...", "line_items":[...]}'
→ { id: "...", status: "draft" }

# Can submit
curl -X POST /api/draws/{id}/submit
→ { status: "submitted" }
```

### UI
- [ ] Eligibility cards show correct amounts
- [ ] "Create Draw" navigates to create page
- [ ] Task selection works (category + individual)
- [ ] Running total updates
- [ ] Save Draft creates draft
- [ ] Submit changes status
- [ ] Draw detail shows all info
- [ ] Status actions work correctly
- [ ] Cannot edit submitted/funded draws

### Business Logic
- [ ] Task only appears in eligibility once (not in multiple draws)
- [ ] Funded draw removes tasks from eligibility
- [ ] Rejected draw: tasks remain eligible

---

## DO NOT

- ❌ Allow editing submitted draws — status gates editing
- ❌ Show tasks already in draws — they're not eligible
- ❌ Allow negative draw amounts
- ❌ Skip validation on submit — verify tasks still verified
- ❌ Delete funded draws — they're historical record

---

## SUCCESS CRITERIA

- [ ] Draws page loads at `/renovations/draws`
- [ ] Eligibility shows correct totals
- [ ] Can create new draw
- [ ] Task selection by category works
- [ ] Draft saves and appears in list
- [ ] Submit transitions status
- [ ] Draw detail shows timeline + line items
- [ ] Status transitions work correctly
- [ ] Alex can answer "what can we draw?" in < 30 seconds
