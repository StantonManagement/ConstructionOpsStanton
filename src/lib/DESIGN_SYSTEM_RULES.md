# Construction Ops Design System - Rules & Standards

**CRITICAL: Reference this file before implementing ANY UI feature.**

## Core Philosophy

**Color = Signal, not decoration.**  
Field PMs need to spot problems instantly, not hunt through visual noise.

1.  **Default everything to gray.**
2.  **Only use color when something requires attention (Critical/Warning).**
3.  **Green (Success) is for confirmations only, not "normal" states.**

## 1. Colors & Signals

Use the semantic variables defined in `globals.css` / `theme.ts`.

| Status | Meaning | Color | Usage |
| :--- | :--- | :--- | :--- |
| **Critical** | Immediate Action Required | `text-status-critical` | Over budget, Overdue payment, Delayed schedule |
| **Warning** | Monitor Closely | `text-status-warning` | 90% budget spent, Due in 7 days |
| **Success** | Confirmation / Done | `text-status-success` | Paid, Completed (Use sparingly) |
| **Neutral** | Normal / No Action | `text-muted-foreground` | On track, Under budget |

**NEVER hardcode colors.**
❌ `text-red-600`
✅ `text-status-critical`

## 2. Components

### `SignalBadge`
Strict "Signal" badge. Only shows when status is NOT neutral (usually).
```tsx
import { SignalBadge } from '@/components/ui/SignalBadge'

// ❌ Don't badge everything
// ✅ Only badge the signals
{status !== 'neutral' && (
  <SignalBadge status={status}>Over Budget</SignalBadge>
)}
```

### `MetricCard`
Standard dashboard summary card. Border-only, no shadow.
```tsx
import { MetricCard } from '@/components/ui/MetricCard'

<MetricCard 
  title="Remaining Budget"
  value="$5,000"
  status="critical" // Turns value text RED automatically
  statusLabel="Alert" // Shows badge
/>
```

### `DataTable`
Standard list view. Gray headers, clean rows.
```tsx
import { DataTable } from '@/components/ui/DataTable'

<DataTable data={items} columns={columns} />
```

## 3. Business Logic

**ALWAYS** import logic from `src/lib/theme.ts`. Do not calculate status inline.

```tsx
import { getBudgetStatus, formatCurrency } from '@/lib/theme'

// ✅ Correct
const status = getBudgetStatus(spent, budget)

// ❌ Wrong
const isCritical = spent > budget
```

## 4. Dark Mode
The system supports dark mode automatically via semantic variables.
- Backgrounds: `bg-card` (Dark Gray)
- Text: `text-foreground` (Off-white)
- Critical Signals: Still Red (adjusted for contrast)

## Checklist for New UI
- [ ] Did I use `MetricCard` for stats?
- [ ] Did I use `SignalBadge` for status?
- [ ] Is the default state gray/neutral?
- [ ] Did I use `getBudgetStatus` / `getPaymentStatus` helpers?
- [ ] Are there any hardcoded hex codes or tailwind colors (red-500)? (Remove them)




