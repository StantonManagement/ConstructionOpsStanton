# Placeholder and Non-Functional Pages

**Last Updated:** January 13, 2026

This document lists all placeholder, non-functional, or "coming soon" pages in the Construction Ops Stanton application.

---

## ✅ RECENTLY FIXED (No Longer Placeholders)

These were placeholders but have been removed/fixed:

1. **Draws Tab in ConstructionDashboard** - ❌ REMOVED
   - Location: `src/app/components/ConstructionDashboard.tsx` (lines 242-249)
   - Status: Removed placeholder, now redirects to `/renovations/draws`
   - Fixed: January 13, 2026

2. **Templates Tab in ConstructionDashboard** - ❌ REMOVED
   - Location: `src/app/components/ConstructionDashboard.tsx` (line 239)
   - Status: Removed placeholder, now redirects to `/renovations/templates`
   - Fixed: January 13, 2026

3. **Cash Position Tab in ConstructionDashboard** - ❌ REMOVED
   - Location: `src/app/components/ConstructionDashboard.tsx` (line 240)
   - Status: Removed placeholder, now redirects to `/cash-flow`
   - Fixed: January 13, 2026

---

## 🟡 ACTIVE PLACEHOLDERS / INCOMPLETE FEATURES

### 1. **Photo Gallery in Project Detail View**
- **Location:** `src/app/components/ProjectDetailView.tsx:583`
- **Message:** "Photo gallery coming soon. Upload and organize project photos here."
- **Status:** Placeholder UI exists, functionality not implemented
- **Priority:** Medium
- **Notes:** Upload button exists but non-functional

### 2. **CSV Import in ManageView**
- **Location:** `src/app/components/ManageView.tsx:1241`
- **Message:** "Import from CSV (Coming Soon)"
- **Status:** Button disabled with tooltip
- **Priority:** Low (Phase 2 feature)
- **Notes:** Planned for Phase 2 implementation

### 3. **Signature Service in Payment Applications**
- **Location:** `src/app/components/PaymentApplicationsView.tsx:991-993`
- **Message:** "Signature service not fully configured yet."
- **Status:** Returns 501 Not Implemented
- **Priority:** Medium
- **Notes:** Graceful handling with warning toast

### 4. **Settings - Coming Soon Features**
- **Location:** `src/app/components/SettingsView.tsx:305`
- **Message:** "Coming Soon" badge on certain settings
- **Status:** UI elements present but functionality pending
- **Priority:** Low
- **Notes:** Specific features marked with coming soon badge

---

## 🟢 FUNCTIONAL BUT APPEAR PLACEHOLDER-LIKE

These pages show empty states but are fully functional - they just have no data:

### Empty State Messages (NOT Placeholders)
1. **No Projects Found** - `ProjectsView.tsx:1148`
2. **No Payment Applications** - `PMDashboard.tsx:2136`
3. **No Daily Log Requests** - `DailyLogsView.tsx:492`
4. **No Blocking Issues** - `reports/blocking/page.tsx:223`
5. **No Trade Data** - `reports/trade/page.tsx:217`
6. **No Templates Found** - `TemplatesView.tsx:121`
7. **No Tasks Yet** - `LocationDetailView.tsx:117`
8. **No Contracts** - `VendorDetailView.tsx:651`
9. **No Payment Apps** - `VendorDetailView.tsx:840`

**Note:** These are proper empty states, not placeholders. The functionality exists and works when data is present.

---

## 🔴 LEGACY/UNUSED ROUTES (Should Be Deleted)

These routes exist but are not linked in navigation and should be removed:

### 1. **Dashboard Route Group** - `src/app/(dashboard)/*`
- `(dashboard)/backlog/page.tsx` - Fully functional but unused
- `(dashboard)/cash-position/page.tsx` - Fully functional but unused
- `(dashboard)/components/page.tsx` - Just imports old locations page
- `(dashboard)/properties/page.tsx` - Not linked
- **Action:** Delete entire `(dashboard)` folder

### 2. **Components Route** - `src/app/components-route/*`
- `components-route/page.tsx` - Empty file
- `components-route/[id]/page.tsx` - Duplicate of main components route
- **Action:** Delete entire `components-route` folder

### 3. **Old Draws System** - `src/app/draws/*`
- `draws/page.tsx` - Superseded by `/renovations/draws`
- `draws/[id]/page.tsx` - Superseded by `/renovations/draws/[id]`
- `draws/new/page.tsx` - Superseded by `/renovations/draws/new`
- **Action:** Delete entire `draws` folder

### 4. **Old Locations System** - `src/app/locations/*`
- `locations/page.tsx` - Superseded by `/renovations/locations`
- `locations/[id]/page.tsx` - Superseded by `/renovations/locations/[id]`
- **Action:** Delete entire `locations` folder

---

## 📋 SUMMARY

| Category | Count | Action Required |
|----------|-------|-----------------|
| Active Placeholders | 4 | Implement or document timeline |
| Empty States (Functional) | 9 | None - working as designed |
| Legacy Routes to Delete | 4 folders | Delete to clean up codebase |
| Recently Fixed | 3 | None - already resolved |

---

## 🎯 RECOMMENDED ACTIONS

### Immediate (High Priority)
1. ✅ **DONE:** Remove placeholder tabs from ConstructionDashboard
2. **Delete legacy route folders** to reduce confusion and maintenance burden

### Short Term (Medium Priority)
3. Implement Photo Gallery functionality in ProjectDetailView
4. Configure Signature Service for Payment Applications

### Long Term (Low Priority)
5. Implement CSV Import (Phase 2)
6. Complete "Coming Soon" settings features

---

## 📝 NOTES

- All pages in `/renovations/*` module are fully functional
- All pages in `/cash-flow/*` are fully functional
- All pages in `/reports/*` are fully functional
- Main dashboard tabs (Overview, Projects, Contractors, Payments) are fully functional
- PM Dashboard is fully functional

**The application is production-ready** with the exception of the 4 minor placeholder features listed above.
