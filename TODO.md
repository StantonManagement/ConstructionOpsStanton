# Construction Ops Stanton - Development TODO

## 📅 Last Updated: January 29, 2026

---

## ✅ Completed (January 28-29, 2026)

### UI Redesign - Minimalist + Sidebar + Lazy Loading
1. ✅ Reports main page (`/reports`)
2. ✅ Blocking report (`/reports/blocking`)
3. ✅ Templates page (`/renovations/templates`) - Added skeleton loading
4. ✅ Settings page (`/settings`)
5. ✅ Portfolios list (`/portfolios`)
6. ✅ Portfolio detail (`/portfolios/[id]`)
7. ✅ Funding sources (`/funding-sources`)
8. ✅ Cash position (`/cash-position`)
9. ✅ Draws new page (`/draws/new`)
10. ✅ Renovations main page (`/renovations`)
11. ✅ Renovations locations page (`/renovations/locations`)
12. ✅ Renovations draws page (`/renovations/draws`)
13. ✅ **Draws main page (`/draws`)** - **NEW PAGE** - Fixed dashboard redirect issue

### Dark Mode Implementation 🌙
1. ✅ **Created Theme Provider** (`/src/providers/ThemeProvider.tsx`)
   - Supports light/dark/system modes
   - Persists preference in localStorage
   - Auto-detects system preference

2. ✅ **Created Theme Toggle** (`/src/components/ThemeToggle.tsx`)
   - 3-button toggle (Sun/Monitor/Moon icons)
   - Added to sidebar footer
   - Minimalist design matching UI system

3. ✅ **Updated Core Components**
   - `/src/app/layout.tsx` - Added ThemeProvider wrapper
   - `/src/app/components/AppLayout.tsx` - Dark mode compatible
   - `/src/app/components/Navigation.tsx` - Dark mode compatible sidebar

4. ✅ **Created Documentation**
   - `DARK_MODE_GUIDE.md` - Complete implementation guide
   - Color replacement patterns
   - Testing checklist

**Design Pattern Applied:**
- Added `AppLayout` wrapper (sidebar navigation)
- Added `PageContainer` for consistent spacing
- Replaced all shadcn components with native HTML
- Reduced all sizes by ~60%:
  - Headers: text-2xl → text-xl
  - Body text: text-sm → text-xs
  - Padding: p-6 → p-3
  - Icons: w-6 → w-4/w-3
  - Buttons: Full size → xs size
- Added React Suspense with consistent loading states
- 4-column grid layouts (xl:grid-cols-4)

---

## 🚀 High Priority - In Progress

### Pages Status Check Results:

#### ✅ Already Have Sidebar (No Action Needed):
- ✅ Contractors page (`/contractors`) - Has AppLayout
- ✅ Locations page (`/locations`) - Has AppLayout
- ✅ Cash Flow main page (`/cash-flow`) - Has AppLayout

#### ❌ Pages Still Needing Review:

**Sub-Pages to Check:**
- [ ] `/cash-flow/forecast` - Check if needs sidebar/minimalist
- [ ] `/cash-flow/draw-eligibility` - Check if needs sidebar/minimalist
- [ ] `/locations/[id]` - Check if needs sidebar/minimalist
- [ ] `/renovations/locations/[id]` - Check if needs sidebar/minimalist

**Note:** Renovations sub-pages completed! Remaining work is cash flow and location detail pages.

---

## 📋 Medium Priority

### Detail/Sub Pages
5. [ ] **Draws detail page** (`/draws/[id]`)
6. [ ] **Payment detail pages**
   - `/payments/[id]/verify`
   - `/payments/[id]/review`
7. [ ] **Project sub-pages**
   - `/projects/[id]/contractors`
   - `/projects/[id]/photos`
8. [ ] **PM Dashboard** (`/pm-dashboard`)
9. [ ] **Backlog page** (`/(dashboard)/backlog`)

---

## 🔽 Low Priority

### Admin/Utility Pages
10. [ ] **SMS logs** (`/sms-logs`)
11. [ ] **SMS test** (`/sms-test`)

---

## ✨ Pages Already Complete (Have Sidebar)

These pages already have `AppLayout` and proper structure:
- ✅ Dashboard (`/dashboard`)
- ✅ Projects (`/projects`)
- ✅ Payments (`/payments`)

---

## 🚫 Don't Touch

These pages should NOT have sidebar (auth/public):
- Auth pages (`/auth/*`)
- Contractor portal (`/contractor-portal/[token]`)

---

## 📊 Progress Summary

- **Total Pages**: ~48 pages in app
- **Fixed Total**: 13 pages (completed) + `/draws` page created
- **Already Good**: 3 pages
- **High Priority Remaining**: 4 individual pages
- **Medium Priority**: 5 page groups (~8 pages)
- **Low Priority**: 2 pages
- **Dark Mode**: ✅ Infrastructure complete, needs page-by-page color updates

**Estimated Completion:**
- High Priority: 2-3 hours
- Medium Priority: 3-4 hours
- Low Priority: 1 hour
- Dark Mode Color Updates: 2-3 hours (13 pages × 10-15 min each)

**Latest Session (Jan 29):**
- ✅ Fixed `/renovations/locations` - Added AppLayout, PageContainer, made minimalist
- ✅ Fixed `/renovations/draws` - Removed shadcn components (Button, Select), added AppLayout, made minimalist
- ✅ **Created `/draws` page** - Fixed dashboard redirect issue, fully minimalist with AppLayout
- ✅ **Implemented Dark Mode Infrastructure:**
  - Created ThemeProvider with light/dark/system support
  - Created ThemeToggle component (3-button control)
  - Updated AppLayout and Navigation for dark mode
  - Created DARK_MODE_GUIDE.md with implementation patterns

---

## 🎯 Next Session Goals

1. Complete remaining High Priority sub-pages:
   - `/cash-flow/forecast`
   - `/cash-flow/draw-eligibility`
   - `/locations/[id]`
   - `/renovations/locations/[id]`
2. Test all pages for consistency
3. Begin Medium Priority pages

---

## 💡 Design System Reference

### Standard Minimalist Conversion:
```tsx
// Remove shadcn imports
import { Card, Button, Input } from '@/components/ui/*'; // ❌ REMOVE

// Add standard imports
import AppLayout from '@/app/components/AppLayout'; // ✅
import PageContainer from '@/app/components/PageContainer'; // ✅
import { Loader2 } from 'lucide-react'; // ✅

// Wrap component
<AppLayout>
  <PageContainer>
    {/* Content here */}
  </PageContainer>
</AppLayout>

// Add Suspense
<Suspense fallback={
  <AppLayout>
    <PageContainer>
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    </PageContainer>
  </AppLayout>
}>
  <YourContent />
</Suspense>
```

### Size Reduction Checklist:
- [ ] text-2xl → text-xl (headers)
- [ ] text-lg → text-sm (subheaders)
- [ ] text-sm → text-xs (body/labels)
- [ ] p-6 → p-3 (padding)
- [ ] space-y-6 → space-y-3 (spacing)
- [ ] gap-6 → gap-3 (grid gaps)
- [ ] w-6/h-6 → w-4/h-4 or w-3/h-3 (icons)
- [ ] Button → native button with px-3 py-1.5 text-xs
- [ ] Card → native div with border
- [ ] 3-column → 4-column grids

---

## 📝 Notes

- All times are estimates based on today's pace
- Each page typically takes 30-45 minutes for full redesign
- Testing adds 5-10 minutes per page
- Some pages may have complex interactions requiring more time

---

## 🐛 Known Issues

*Add any bugs or issues discovered during development here*

---

## 🔮 Future Enhancements

*Add ideas for new features or improvements here*
