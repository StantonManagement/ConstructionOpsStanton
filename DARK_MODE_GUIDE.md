# Dark Mode Implementation Guide

## ✅ Completed

### 1. Theme Infrastructure
- ✅ Created `/src/providers/ThemeProvider.tsx` - Handles theme state (light/dark/system)
- ✅ Created `/src/components/ThemeToggle.tsx` - 3-button toggle (Sun/Monitor/Moon)
- ✅ Updated `/src/app/layout.tsx` - Added ThemeProvider wrapper
- ✅ Updated `/src/app/components/Navigation.tsx` - Added theme toggle to sidebar footer
- ✅ Updated `/src/app/components/AppLayout.tsx` - Changed `bg-gray-50` → `bg-background`

### 2. CSS Variables
Dark mode CSS variables already exist in `/src/app/globals.css`:
- All Tailwind color tokens have dark mode variants
- System uses `darkMode: ["class"]` in tailwind.config.js

## 📋 Color Replacement Guide

### Common Replacements Needed:

| **Hardcoded Color** | **Replace With** | **Context** |
|---------------------|------------------|-------------|
| `bg-white` | `bg-card` | Card backgrounds |
| `bg-gray-50` | `bg-background` or `bg-muted` | Page backgrounds |
| `bg-gray-100` | `bg-muted` | Subtle backgrounds |
| `text-gray-900` | `text-foreground` | Primary text |
| `text-gray-500` | `text-muted-foreground` | Secondary text |
| `text-gray-600` | `text-muted-foreground` | Icon colors |
| `text-gray-700` | `text-foreground` | Labels |
| `border-gray-200` | `border-border` | Borders |
| `border-gray-300` | `border-border` | Input borders |
| `hover:bg-gray-50` | `hover:bg-muted` | Hover states |
| `hover:bg-gray-100` | `hover:bg-accent hover:text-accent-foreground` | Button hovers |

### Status-Specific Colors (Keep as-is):
These use specific color values and are okay:
- `bg-blue-50`, `text-blue-700` - Info/Draft status
- `bg-green-50`, `text-green-700` - Success/Approved status
- `bg-red-50`, `text-red-700` - Error/Rejected status
- `bg-orange-50`, `text-orange-700` - Warning status
- `bg-purple-50`, `text-purple-700` - Funded status

### Button Patterns:
```tsx
// Before
className="px-3 py-1.5 bg-primary text-white rounded hover:bg-primary/90"

// After (already correct)
className="px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90"
```

### Card Pattern:
```tsx
// Before
<div className="bg-white rounded-lg border border-gray-200 p-3">

// After
<div className="bg-card text-card-foreground rounded-lg border border-border p-3">
```

### Input Pattern:
```tsx
// Before
<input className="px-2 py-1.5 text-xs border border-gray-300 rounded bg-white" />

// After
<input className="px-2 py-1.5 text-xs border border-border rounded bg-background text-foreground focus:ring-2 focus:ring-ring" />
```

### Select Pattern:
```tsx
// Before
<select className="px-2 py-1.5 text-xs border border-gray-300 rounded bg-white">

// After
<select className="px-2 py-1.5 text-xs border border-border rounded bg-background text-foreground focus:ring-2 focus:ring-ring">
```

## 🎯 Pages to Update

### High Priority (Recently Completed):
1. `/draws/page.tsx` - NEW page created today
2. `/renovations/locations/page.tsx` - Fixed today
3. `/renovations/draws/page.tsx` - Fixed today
4. `/renovations/page.tsx`
5. `/draws/new/page.tsx`
6. `/cash-position/page.tsx`
7. `/funding-sources/page.tsx`
8. `/portfolios/page.tsx`
9. `/portfolios/[id]/page.tsx`
10. `/settings/page.tsx`
11. `/reports/page.tsx`
12. `/reports/blocking/page.tsx`
13. `/renovations/templates/page.tsx`

### Components to Check:
- `TemplatesView.tsx`
- `SettingsView.tsx`
- `ExcelBudgetTable.tsx`
- `MetricCard.tsx`
- `ProjectCard.tsx`
- All report components

## 🚀 Quick Implementation Steps

### Step 1: Batch Replace in Files
Use find/replace across these patterns:

1. **Backgrounds:**
   - `bg-white` → `bg-card`
   - `bg-gray-50` → `bg-background`
   - `bg-gray-100` → `bg-muted`

2. **Text:**
   - `text-gray-900` → `text-foreground`
   - `text-gray-500` → `text-muted-foreground`
   - `text-gray-600` → `text-muted-foreground`
   - `text-gray-700` → `text-foreground`

3. **Borders:**
   - `border-gray-200` → `border-border`
   - `border-gray-300` → `border-border`

4. **Hovers:**
   - `hover:bg-gray-50` → `hover:bg-muted`
   - `hover:bg-gray-100` → `hover:bg-accent hover:text-accent-foreground`

### Step 2: Test Each Page
After replacements:
1. Toggle theme to dark mode using sidebar toggle
2. Check all text is readable
3. Check all cards/borders are visible
4. Check hover states work
5. Check input fields are usable

### Step 3: Special Cases
Some elements may need explicit dark mode handling:
```tsx
// Spinner colors
<Loader2 className="text-gray-400" /> → <Loader2 className="text-muted-foreground" />

// Empty state icons
<FileText className="text-gray-300" /> → <FileText className="text-muted-foreground opacity-50" />

// Dividers
<div className="border-t border-gray-200" /> → <div className="border-t border-border" />
```

## ✨ Usage

Users can now toggle theme using the 3-button control in the sidebar footer:
- **Sun icon** - Light mode
- **Monitor icon** - System theme (auto)
- **Moon icon** - Dark mode

Theme preference is persisted in localStorage.

## 🐛 Known Issues to Watch For

1. **Contrast**: Some blue/gray combinations may have low contrast in dark mode
2. **Images**: Screenshots/images may need dark mode variants
3. **Charts**: ApexCharts may need dark theme configuration
4. **Modals**: Modal overlays need `bg-black/50` instead of `bg-black bg-opacity-50`

## 📝 Next Steps

1. Run batch replacements on all 13 high-priority pages
2. Test each page in both themes
3. Update TODO.md with dark mode completion status
4. Consider adding dark mode to auth pages
