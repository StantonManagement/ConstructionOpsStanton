# Navigation Redesign - Cursor Instructions

## Goal
Consolidate navigation from 11 tabs to 4 (Admin/Staff) and 3 (PM). Follow the natural workflow: Projects → Contractors → Contracts → Payments.

---

## Step 1: Update Navigation Tabs

**What to do:**
- Find the navigation component (likely `Navigation.tsx` or in `ConstructionDashboard.tsx`)
- Replace the tab list with new simplified structure

**Admin/Staff tabs (4):**
1. Overview (keep as-is)
2. Projects (major changes)
3. Payments (merge PaymentApplications + PaymentProcessing)
4. Settings (move Users here, add sub-tabs)

**PM tabs (3):**
1. Payments (default)
2. My Projects (read-only version)
3. Daily Logs (keep as-is)

**Remove these tabs:**
- "Pay Apps" (merging into Payments)
- "Payment Processing" (merging into Payments)
- "Subcontractors" (moving into Projects)
- "Manage" (splitting up)
- "Metrics" (moving to Overview)
- Standalone "Users" (moving to Settings)

**Critical:** Don't break existing functionality - just reorganize where things live.

---

## Step 2: Projects Tab Redesign

**Current state:** Simple list of projects with edit buttons

**New structure:** 
```
Projects List View (default)
  → Click project → Project Detail View
      → Sub-tabs: [Details] [Contractors] [Payments] [Documents]
          → Contractors tab shows:
              • Contractor cards (nested)
              • Each card has contract info + line items
              • "Request Payment" button (starts SMS)
              • "View Contract Details" (opens line items modal)
```

**What to change:**
1. Add drill-down: clicking a project card opens `ProjectDetailView`
2. Create `ProjectDetailView` component with 4 sub-tabs
3. Create `ProjectContractorsTab` - shows contractors for THIS project
4. Create `ContractorCard` component - shows:
   - Contractor info (name, trade, phone)
   - Contract summary (amount, paid, remaining)
   - Line items preview (3-5 items, expandable)
   - Actions: [Request Payment] [Edit Contract] [View All Line Items]

**Key point:** Contractors are now NESTED in projects, not a separate top-level tab.

---

## Step 3: Payments Tab (Merge)

**Merge these two existing tabs:**
- PaymentApplicationsView (the list)
- PaymentProcessingView (the project → contractor selection flow)

**New unified "Payments" tab:**
```
Payments
  → Filter: [Pending (5)] [Approved] [Rejected] [All]
  → Payment cards (same as current PaymentApplicationsView)
  → Each card has [Review Now] button
  → "Review Now" opens existing verification page
```

**What to remove:**
- The separate "Payment Processing" tab
- The project selection flow (this now happens in Projects tab)

**What to keep:**
- All payment cards/list functionality
- Verification page (payments/[id]/verify)
- Approval/reject logic
- SMS sending

**Critical:** The "Request Payment" button now lives in Projects → Project Detail → Contractors. When clicked, it should create the payment app and start SMS (existing logic).

---

## Step 4: Settings Tab (New)

**Create new "Settings" tab with sub-tabs:**
```
Settings
  → [Users] [Company] [Integrations] [Preferences]
```

**Users sub-tab:**
- Move entire `UserManagementView` here
- Keep all existing functionality

**Other sub-tabs:**
- Company: Basic info form (create new, simple)
- Integrations: Placeholder for now ("Coming soon")
- Preferences: Placeholder for now ("Coming soon")

---

## Step 5: Update Existing Modals

**Contract Modal (your Excel-like line items):**
- This modal still exists and works the same
- Now triggered from two places:
  1. Projects → Project Detail → Contractors → "Edit Contract"
  2. Projects → Project Detail → Contractors → "View All Line Items"

**No changes to modal itself** - just update where it's called from.

---

## Step 6: Update Routing

**If you have URL routing:**

**Old URLs to redirect:**
```
/dashboard/payapps → /dashboard/payments
/dashboard/payment-processing → /dashboard/projects
/dashboard/subcontractors → /dashboard/projects
/dashboard/manage → /dashboard/projects or /dashboard/settings
/dashboard/users → /dashboard/settings
```

**New URL structure:**
```
/dashboard/overview
/dashboard/projects
/dashboard/projects/:id (detail view)
/dashboard/payments
/dashboard/payments/:id/verify (keep existing)
/dashboard/settings
/dashboard/settings/users
```

---

## Critical Checks Before Committing

**Test these flows:**

1. **Create new project:**
   - Projects → "+ New Project" → Fill form → Save
   - Should stay on Projects tab, new project appears

2. **Add contractor to project:**
   - Projects → Click project → Contractors tab → "+ Add Contractor"
   - Modal opens → Select contractor, enter amount → Save
   - Contractor card appears

3. **Add line items to contract:**
   - On contractor card → Click "View Contract Details"
   - Your Excel-like modal opens → Add line items → Save
   - Line items save correctly

4. **Request payment:**
   - On contractor card → Click "Request Payment"
   - Existing SMS flow starts (don't break this)
   - Payment app created with status 'initiated'

5. **Review payment (PM):**
   - PM logs in → Payments tab is default
   - Click "Review Now" on pending payment
   - Verification page opens (existing page)
   - Approve/Reject works

6. **User management:**
   - Settings → Users tab
   - Add/Edit/Delete user works
   - All existing functionality intact

---

## What NOT to Change

**Leave these alone:**
- Payment verification page (payments/[id]/verify) - works perfectly
- Line items modal/table - works perfectly
- SMS webhook logic - don't touch
- Database queries/mutations - don't modify
- React Query hooks - don't modify

**Only change:**
- Navigation structure
- Component organization
- Where components are rendered
- Which tab shows which content

---

## Red Flags to Watch For

**If you see these, STOP:**
- Breaking changes to existing modals
- Database schema modifications
- API route changes
- Supabase query modifications
- Payment approval logic changes

**You should only be:**
- Moving components around
- Changing navigation
- Adding new wrapper components
- Updating which tab shows which view

---

## Testing Checklist

After changes, verify:
- [ ] All 4 admin tabs load without errors
- [ ] All 3 PM tabs load without errors
- [ ] Can create new project
- [ ] Can drill into project details
- [ ] Can see contractors on project
- [ ] Can add contractor to project
- [ ] Can edit contract line items
- [ ] Can request payment from contractor card
- [ ] Payments tab shows all payment apps
- [ ] Can review/approve payments as PM
- [ ] User management works in Settings
- [ ] No console errors
- [ ] No broken links
- [ ] All existing features still work

---

## Implementation Order

1. **Navigation tabs** - Update tab list (10 min)
2. **Projects drill-down** - Add detail view (30 min)
3. **Contractors nested** - Create contractor cards (30 min)
4. **Payments merge** - Combine two tabs (20 min)
5. **Settings tab** - Move users, add structure (15 min)
6. **Routing updates** - Fix URLs (15 min)
7. **Testing** - Run through checklist (30 min)

**Total: ~2.5 hours**

---

## Success Criteria

**You're done when:**
- Admin sees 4 tabs: Overview, Projects, Payments, Settings
- PM sees 3 tabs: Payments, My Projects, Daily Logs
- Clicking a project shows detail view with contractors nested
- Payment request button is on contractor card in project view
- All payments (pending/approved/rejected) in one Payments tab
- User management is in Settings → Users
- All existing functionality works exactly the same
- No features were lost, just reorganized