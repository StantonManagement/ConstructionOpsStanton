# Navigation Redesign - Final Implementation Guide

## ⚠️ CRITICAL: Database Connection Issues

**READ THIS FIRST - This keeps breaking:**

### Common Next.js + Supabase Connection Issues You're Hitting:

1. **Stale Client Instance** - Creating new Supabase client on every render
2. **Server vs Client Components** - Wrong import for server/client context
3. **No Stale Time in React Query** - Refetching on every component mount
4. **Connection Pool Exhaustion** - Too many simultaneous connections
5. **Missing Error Handling** - Silent failures that break the UI

### Before Making ANY Changes:

**Check these files are configured correctly:**
- `lib/supabaseClient.ts` - Singleton client
- `lib/queryClient.ts` - React Query config with proper staleTime (30s minimum)
- `app/layout.tsx` - Providers in correct order: AuthProvider → ReactQueryProvider → Children

**Test connection FIRST:**
```bash
npm run dev
# Check browser console for "Failed to fetch" errors
# Check Network tab for 200 responses from Supabase
# Check Supabase dashboard connection count isn't spiking
```

### During Implementation:

**After EVERY file change:**
1. Check console for connection errors
2. Check React Query DevTools shows queries succeeding
3. Check Network tab shows 200s from Supabase
4. If anything breaks: Stop server, clear cache, restart

**Common fix when it breaks:**
1. Stop dev server
2. Check you're not creating multiple supabase instances
3. Clear browser cache completely
4. Restart dev server
5. Check Supabase dashboard for high connection count

---

## Database Schema Updates FIRST

Run these migrations BEFORE any code changes:

```sql
-- Add to project_contractors
ALTER TABLE project_contractors 
ADD COLUMN display_order INTEGER DEFAULT 0,
ADD COLUMN original_contract_amount NUMERIC DEFAULT 0;

UPDATE project_contractors 
SET original_contract_amount = contract_amount 
WHERE original_contract_amount = 0;

-- Add to project_line_items
ALTER TABLE project_line_items
ADD COLUMN display_order INTEGER DEFAULT 0,
ADD COLUMN change_order_amount NUMERIC DEFAULT 0;

UPDATE project_line_items 
SET display_order = id 
WHERE display_order = 0;
```

**Verify migrations worked:**
Check Supabase dashboard that columns exist before proceeding.

---

## Navigation Structure

### Admin/Staff (4 tabs):
1. **Overview** - Dashboard (keep as-is)
2. **Projects** - Main project management (major changes)
3. **Payments** - All payment apps (merge two existing tabs)
4. **Settings** - User management + config (new)

### PM (3 tabs):
1. **Payments** - Review payment apps (default tab)
2. **My Projects** - Read-only project view
3. **Daily Logs** - Request updates (keep as-is)

### Remove these tabs:
- "Pay Apps" → merge into Payments
- "Payment Processing" → merge into Payments
- "Subcontractors" → move into Projects (nested)
- "Manage" → split contents
- "Metrics" → move to Overview
- Standalone "Users" → move to Settings

---

## Projects Tab - New Structure

### Page Flow:
```
Projects List (default)
  ↓ Click project card
Project Detail Page (full page, NOT modal)
  ↓ Sub-tabs: [Details] [Contractors] [Payments] [Documents]
  ↓ Contractors tab = default, shows draggable cards
  ↓ Click contractor card
Contractor Detail Page (full page, NOT modal)
  ↓ Shows draggable line items table
  ↓ Three money columns: Original | COs | Current
```

### Projects List
**What to change:**
- Add state for selected project
- If project selected, show `ProjectDetailView` component
- Otherwise show project list
- Make project cards clickable, set selectedProjectId on click

### Project Detail Page (NEW component)

**Create: `ProjectDetailView.tsx`**

**Top section shows 4 cards:**
1. Budget (total project budget)
2. Spent (sum of all paid amounts)
3. Committed (sum of approved but unpaid)
4. Remaining (budget - spent - committed)

**Sub-tabs:**
- Details (basic project info)
- **Contractors (default tab)** - Draggable contractor cards
- Payments (all payment apps for this project)
- Documents (placeholder)

### Contractors Tab (NEW component)

**Create: `ProjectContractorsTab.tsx`**

**Query needs:**
- Get all `project_contractors` for this project
- Join with `contractors` table
- Order by `display_order ASC`
- Include count of line items

**Each contractor card shows:**
- Drag handle (≡ icon)
- Contractor name, phone, email
- **Three money values:**
  - Original: `original_contract_amount`
  - COs: `contract_amount - original_contract_amount`
  - Current: `contract_amount`
- Progress bar showing % paid
- Paid amount, Approved amount, Remaining amount
- Buttons: [View Breakdown] [Request Payment] [Add Change Order]

**Make cards clickable** - clicking opens ContractorDetailView

**Implement drag-to-reorder:**
- Use `@dnd-kit` (already in dependencies)
- On drop, update `display_order` column for all contractors
- Use optimistic updates
- If save fails, revert order

### Contractor Detail Page (NEW component)

**Create: `ContractorDetailView.tsx`**

**Back button** returns to ProjectDetailView

**Top section shows 5 cards:**
1. Original Contract
2. Change Orders (COs)
3. Current Total (Original + COs)
4. Paid to Date
5. Remaining

**Line Items Table:**

**Columns (in order):**
- ≡ (drag handle)
- # (item number, auto-numbered)
- Description
- **Original** (scheduled_value)
- **COs** (change_order_amount)
- **Current** (scheduled_value + change_order_amount)
- Prev % (from previous pay app)
- Curr % (current completion)
- Paid (calculated from current * curr%)

**Visual notes:**
- If `change_order_amount != 0`, show in orange/yellow
- If line item was added by CO (original = $0), clearly indicate this
- Show totals row at bottom

**Implement drag-to-reorder:**
- Same pattern as contractors
- Update `display_order` in `project_line_items`
- Auto-renumber the "#" column after reorder

**Actions:**
- [Request Payment] - starts SMS flow
- [Add Line Item] - existing modal
- [Add Change Order] - new modal (placeholder for now)
- [Export to Excel]

---

## Payments Tab - Merge Two Tabs

**Merge these:**
- PaymentApplicationsView (the list)
- PaymentProcessingView (project → contractor flow)

**New unified Payments tab:**

**Remove:**
- The project selection flow (now happens in Projects tab)
- Separate "Payment Processing" tab

**Keep:**
- Payment cards list
- Status filters: [Pending] [Approved] [Rejected] [All]
- "Review Now" button → existing verification page
- All approval/rejection logic

**Key change:**
- "Request Payment" button now lives in Projects → Contractor card
- This tab is now read-only except for Review/Approve/Reject actions

---

## Settings Tab - New Structure

**Create new Settings tab with sub-tabs:**
- **Users** - Move entire UserManagementView here
- Company - Placeholder ("Coming soon")
- Integrations - Placeholder ("Coming soon")
- Preferences - Placeholder ("Coming soon")

---

## Critical Implementation Notes

### For Drag-and-Drop:

**Use `@dnd-kit` (already installed):**
- Import: `@dnd-kit/core` and `@dnd-kit/sortable`
- Wrap list in `<DndContext>` and `<SortableContext>`
- Each item uses `useSortable()` hook
- On drag end: update `display_order` column
- Use optimistic updates (update UI immediately, then save)

### For Money Calculations:

**Original vs Current:**
- `original_contract_amount` = base contract when created
- `contract_amount` = current total (original + all COs)
- Change orders = `contract_amount - original_contract_amount`

**For line items:**
- `scheduled_value` = original amount for this line item
- `change_order_amount` = $ added/removed by COs
- Current value = `scheduled_value + change_order_amount`

**When creating new contracts:**
- Set `original_contract_amount = contract_amount` initially
- Set `change_order_amount = 0` for all line items

### For Routing:

**If you have URL routing, update:**
```
Old → New
/dashboard/payapps → /dashboard/payments
/dashboard/payment-processing → /dashboard/projects
/dashboard/subcontractors → /dashboard/projects
/dashboard/manage → /dashboard/projects or /dashboard/settings
/dashboard/users → /dashboard/settings

New URLs:
/dashboard/projects/:id → project detail
/dashboard/projects/:projectId/contractors/:contractorId → contractor detail
```

---

## Testing Checklist

### After each phase, verify:

**Phase 1 - Navigation:**
- [ ] Admin sees 4 tabs only
- [ ] PM sees 3 tabs only
- [ ] All tabs load without errors
- [ ] No broken links
- [ ] No console errors

**Phase 2 - Projects:**
- [ ] Can view project list
- [ ] Clicking project opens detail page (full page, not modal)
- [ ] Detail page shows 4 budget cards with correct totals
- [ ] Can see contractors on Contractors tab
- [ ] Contractors show correct Original/COs/Current breakdown

**Phase 3 - Drag-and-Drop:**
- [ ] Can drag contractor cards to reorder
- [ ] Order saves to database (check `display_order` column)
- [ ] Order persists on refresh
- [ ] Clicking contractor opens detail page (full page, not modal)
- [ ] Can drag line items to reorder
- [ ] Line item order saves and persists

**Phase 4 - Contractor Detail:**
- [ ] Line items table shows 3 money columns correctly
- [ ] Totals row calculates correctly
- [ ] Can see which items were added by CO (Original = $0)
- [ ] Actions buttons work (Request Payment, etc)

**Phase 5 - Payments:**
- [ ] All payment apps show in one list
- [ ] Status filters work
- [ ] Can review/approve payments
- [ ] Existing verification page still works
- [ ] SMS flow still works when requesting payment from contractor card

**Phase 6 - Settings:**
- [ ] User management works in Settings → Users
- [ ] Can add/edit/delete users
- [ ] All existing user management features intact

### Database Connection Health Check:

**After ALL changes, verify:**
- [ ] No "Failed to fetch" in console
- [ ] React Query DevTools shows queries succeeding
- [ ] Network tab shows 200 responses
- [ ] Supabase dashboard shows normal connection count (<10)
- [ ] Page loads don't spike connection count
- [ ] No duplicate queries firing

---

## What NOT to Touch

**Leave these components completely alone:**
- Payment verification page (`payments/[id]/verify`)
- Line items modal/table component (the Excel-like one)
- SMS webhook handlers
- Payment approval/rejection logic
- Supabase queries/mutations in existing hooks
- React Query hook implementations

**Only change:**
- Navigation structure
- Component organization
- Where components render
- Which tab shows which content
- Page routing/navigation flow

---

## Implementation Order

**Do in this exact order:**

1. **Database migrations** (10 min)
   - Add columns
   - Verify in Supabase dashboard

2. **Test DB connection** (5 min)
   - Check all queries still work
   - Fix any broken connections BEFORE proceeding

3. **Navigation tabs** (15 min)
   - Update tab list
   - Remove old tabs
   - Test all tabs load

4. **Projects list → detail flow** (30 min)
   - Add drill-down capability
   - Create ProjectDetailView component
   - Test navigation works

5. **Contractors tab with cards** (45 min)
   - Create ProjectContractorsTab
   - Show contractor cards with 3 money columns
   - Make clickable
   - Test navigation to contractor detail

6. **Drag-and-drop contractors** (30 min)
   - Add @dnd-kit to contractor cards
   - Save display_order on drop
   - Test order persists

7. **Contractor detail page** (45 min)
   - Create ContractorDetailView
   - Line items table with 3 columns
   - Calculate totals correctly
   - Test all data displays correctly

8. **Drag-and-drop line items** (20 min)
   - Add @dnd-kit to line items table
   - Save display_order on drop
   - Test order persists

9. **Merge payment tabs** (20 min)
   - Combine into single PaymentsView
   - Remove old PaymentProcessingView
   - Test all payment functionality works

10. **Settings tab** (15 min)
    - Create Settings structure
    - Move UserManagement
    - Test user management still works

11. **Final testing** (30 min)
    - Run full checklist
    - Test all workflows end-to-end
    - Fix any issues

**Total: ~4 hours**

---

## Success Criteria

**You're done when:**
- Navigation shows 4 tabs (Admin) or 3 tabs (PM)
- Projects drills down: List → Detail → Contractor Detail
- All contractor/line item money shows: Original | COs | Current
- Drag-and-drop works and persists for both contractors and line items
- Payments tab shows all payment apps in one place
- Settings contains user management
- **Database connections stay stable throughout**
- All existing features work exactly as before
- No console errors
- No broken functionality

**Red flags that mean STOP:**
- Console shows connection errors
- Queries start failing
- Connection count spikes in Supabase
- Page loads are slow
- Data not saving properly

**If you see red flags:**
1. Stop immediately
2. Check supabase client isn't being created multiple times
3. Check React Query staleTime is set (30s minimum)
4. Clear cache and restart dev server
5. Fix connection issues before continuing