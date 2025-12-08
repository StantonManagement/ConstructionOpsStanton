# Navigation Map - Construction Ops Stanton

## Main Navigation (Top Level)

### 1. Overview Tab
- **ID:** `overview`
- **Icon:** Home
- **Access:** All users
- **Route:** `/?tab=overview`
- **Component:** `OverviewView`
- **Status:** ❓ (To be tested)

### 2. Projects Tab  
- **ID:** `projects`
- **Icon:** Building
- **Access:** All users
- **Route:** `/?tab=projects`
- **Component:** `ProjectsView`
- **Status:** ✅ (Working - recently tested with punch lists)

### 3. Field Ops Tab
- **ID:** `field-ops`
- **Icon:** Clipboard
- **Access:** All users
- **Route:** `/?tab=field-ops`
- **Component:** `FieldOpsView`
- **Status:** ⚠️ (Modified to redirect to project punch lists)

### 4. Payments Tab
- **ID:** `payments`
- **Icon:** DollarSign
- **Access:** All users
- **Route:** `/?tab=payments`
- **Component:** `PaymentsView`
- **Status:** ❓ (To be tested)

### 5. Change Orders Tab
- **ID:** `change-orders`
- **Icon:** GitBranch
- **Access:** Admin and PM only
- **Route:** `/?tab=change-orders`
- **Component:** `ChangeOrdersView`
- **Status:** ❓ (Phase 3 feature - may need migrations)

### 6. Budget Dashboard Tab ⚠️ KNOWN BROKEN
- **ID:** `budget`
- **Icon:** BarChart2
- **Access:** Admin and PM only
- **Route:** `/?tab=budget`
- **Component:** `BudgetDashboard`
- **Status:** ❌ BROKEN
- **Issue:** Queries non-existent tables:
  - `property_budgets_summary`
  - `change_orders_detail`
  - Missing columns in `projects` table: `owner_entity_id`, `portfolio_name`
- **API File:** `src/app/api/dashboard/budget-metrics/route.ts`

### 7. Settings Tab
- **ID:** `settings`
- **Icon:** Settings
- **Access:** All users
- **Route:** `/?tab=settings`
- **Component:** `SettingsView`
- **Status:** ❓ (To be tested)

### 8. Daily Logs Tab
- **ID:** `daily-logs`
- **Icon:** FileText
- **Access:** Admin and Staff only
- **Route:** `/?tab=daily-logs`
- **Component:** `DailyLogsView`
- **Status:** ❓ (To be tested)

---

## Project Detail View Sub-Tabs

When viewing a specific project (`/?tab=projects&project=ID`), these sub-tabs are available:

### 1. Details Sub-tab
- **ID:** `details`
- **Icon:** Building
- **Component:** `DetailsTab`
- **Status:** ❓ (To be tested)

### 2. Contractors Sub-tab
- **ID:** `contractors`
- **Icon:** Users
- **Component:** `ProjectContractorsTab`
- **Status:** ✅ (Working - tested)

### 3. Budget Sub-tab
- **ID:** `budget`
- **Icon:** TrendingUp
- **Component:** `ProjectBudgetDetail`
- **Status:** ❓ (To be tested)

### 4. Payments Sub-tab
- **ID:** `payments`
- **Icon:** DollarSign
- **Component:** `PaymentsTab`
- **Status:** ❓ (To be tested)

### 5. Punch Lists Sub-tab
- **ID:** `punchlists`
- **Icon:** ListChecks
- **Component:** `PunchListsTab`
- **Status:** ✅ WORKING (Just fixed and tested)

### 6. Documents Sub-tab
- **ID:** `documents`
- **Icon:** FileText
- **Component:** `DocumentsTab`
- **Status:** ❓ (Placeholder - shows "coming soon" message)

---

## Critical User Actions to Test

### Projects Flow
- [ ] Create new project
- [ ] Edit existing project
- [ ] Delete project
- [ ] View project details
- [ ] Switch between projects

### Contractors Flow  
- [ ] Add contractor to project
- [ ] View contractor details
- [ ] Create payment application for contractor
- [ ] View contractor payment history

### Payment Applications Flow
- [ ] Create new payment application
- [ ] Submit for approval
- [ ] Approve payment application
- [ ] Reject payment application
- [ ] View payment application details

### Punch Lists Flow (RECENTLY FIXED)
- [x] Create punch list item without contractor
- [x] Create punch list item with contractor (no SMS)
- [x] Create punch list item with contractor + SMS
- [ ] Edit punch list item
- [ ] Delete punch list item
- [ ] Mark item as complete
- [ ] Verify completed item

---

## Known Issues Summary

### P0 - Critical (Must Fix)
1. **Budget Dashboard** - Completely broken, queries non-existent tables

### P1 - Important
- TBD (will be identified during testing)

### P2 - Nice to Have
- TBD (will be identified during testing)

---

## Testing Priority

1. **Main Tabs:** Test Overview, Projects, Payments, Field Ops, Settings
2. **Project Detail Tabs:** Test all sub-tabs in project detail view
3. **CRUD Operations:** Create, Read, Update, Delete for all major features
4. **Role-Based Access:** Verify admin/PM-only tabs are restricted

---

## Notes
- User has demo with business partner - need working features only
- Hide or show "Coming Soon" for broken non-critical features
- Prioritize fixing P0 issues that block demos

