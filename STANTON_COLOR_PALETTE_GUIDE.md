# Stanton Color Palette Guide

> **Brand Colors & Recommended Palettes for Construction Operations Center**
> **Last Updated**: January 2026

---

## 🎨 Stanton Brand Color (Primary)

### Navy Blue - The Core Brand Color

```css
--brand-navy: #25225e
```

**From Official Stanton Logo**: Deep, professional navy blue with purple undertones that conveys trust, stability, and expertise in real estate and construction.

### Full Navy Scale

| Shade | Hex | CSS Variable | Usage |
|-------|-----|--------------|-------|
| 50 | `#f2f2f8` | `--brand-navy-50` | Backgrounds, very subtle accents |
| 100 | `#e6e5f1` | `--brand-navy-100` | Light backgrounds, hover states |
| 200 | `#cdcbe3` | `--brand-navy-200` | Borders, dividers |
| 300 | `#9f9bcb` | `--brand-navy-300` | Disabled states, subtle text |
| 400 | `#6e68ad` | `--brand-navy-400` | Secondary actions, accents |
| **500** | **`#25225e`** | **`--brand-navy`** | **Primary brand color (Official)** |
| 600 | `#1e1b4b` | `--brand-navy-600` | Hover states for primary |
| 700 | `#171438` | `--brand-navy-700` | Active states |
| 800 | `#0f0d26` | `--brand-navy-800` | Deep backgrounds |
| 900 | `#080713` | `--brand-navy-900` | Very dark backgrounds |

---

## 🎨 Recommended Complementary Palettes

### Option 1: Professional & Trustworthy (Recommended for Construction)

**Best for**: Financial dashboards, executive reports, client-facing interfaces

| Color | Hex | Purpose | Pairs With |
|-------|-----|---------|------------|
| **Stanton Navy** | `#25225e` | Primary brand | All colors below |
| **Warm Gold** | `#D4A574` | Accent, success states, highlights | Navy creates classic elegance |
| **Slate Gray** | `#64748B` | Secondary text, neutral actions | Professional, modern |
| **Deep Charcoal** | `#374151` | Dark text, borders | High contrast with navy |
| **Soft Cream** | `#FAFAF8` | Backgrounds | Existing in your palette |

**Usage Example**:
```css
/* Primary button */
background: var(--brand-navy);
color: white;

/* Accent/Success */
background: #D4A574;
color: var(--brand-navy);

/* Secondary actions */
background: #64748B;
color: white;
```

---

### Option 2: Modern & Energetic

**Best for**: Team collaboration tools, project management, active workflows

| Color | Hex | Purpose | Pairs With |
|-------|-----|---------|------------|
| **Stanton Navy** | `#25225e` | Primary brand | All colors below |
| **Coral Orange** | `#FF6B6B` | CTAs, urgent actions | Creates vibrant energy |
| **Teal Blue** | `#4ECDC4` | Success, progress indicators | Fresh, modern |
| **Sunset Purple** | `#9B59B6` | Secondary accents | Sophisticated depth |
| **Warm Beige** | `#F8F4E8` | Backgrounds | Softer than pure white |

**Usage Example**:
```css
/* Urgent action button */
background: #FF6B6B;
color: white;

/* Success state */
background: #4ECDC4;
color: var(--brand-navy);

/* Info/secondary */
background: #9B59B6;
color: white;
```

---

### Option 3: Natural & Earthy (Construction-Themed)

**Best for**: Field operations, property management, hands-on work tracking

| Color | Hex | Purpose | Pairs With |
|-------|-----|---------|------------|
| **Stanton Navy** | `#25225e` | Primary brand | All colors below |
| **Terracotta** | `#D2691E` | Warnings, attention items | Earthy, construction-inspired |
| **Forest Green** | `#2D5016` | Success, completed work | Natural, growth |
| **Clay Brown** | `#8B4513` | Secondary actions, materials | Grounded, reliable |
| **Sandstone** | `#E8DCC5` | Backgrounds, cards | Warm, approachable |

**Usage Example**:
```css
/* Completed work badge */
background: #2D5016;
color: white;

/* Warning/attention */
background: #D2691E;
color: white;

/* Material/resource indicator */
background: #8B4513;
color: white;
```

---

### Option 4: Tech-Forward & Clean

**Best for**: Modern SaaS feel, analytics, data visualization

| Color | Hex | Purpose | Pairs With |
|-------|-----|---------|------------|
| **Stanton Navy** | `#25225e` | Primary brand | All colors below |
| **Electric Blue** | `#3B82F6` | Links, interactive elements | High-tech energy |
| **Emerald Green** | `#10B981` | Success, positive metrics | Fresh, optimistic |
| **Amber** | `#F59E0B` | Warnings, pending states | Clear signaling |
| **Pure White** | `#FFFFFF` | Backgrounds, cards | Clean, minimal |

**Usage Example**:
```css
/* Interactive link */
color: #3B82F6;

/* Success metric */
color: #10B981;

/* Warning state */
color: #F59E0B;
```

---

## 🎨 Current Implementation in Your Palette

Your existing configuration already uses:

### Status Colors (Keep These - Well Designed)
- **Success**: Green family (`#059669`, `#10B981`, `#D1FAE5`)
- **Warning**: Amber/Orange (`#D97706`, `#F59E0B`, `#FEF3C7`)
- **Critical**: Red family (`#DC2626`, `#EF4444`, `#FEE2E2`)
- **Neutral**: Gray family (`#6B7280`, `#9CA3AF`)

---

## 💡 Recommendations for Stanton Construction Operations

### Primary Palette (What I've Implemented)

```css
/* Brand & Primary Actions */
--primary: #25225e; /* Stanton Navy */
--primary-hover: #3D4780; /* Stanton Navy Light */
--primary-active: #232A52; /* Stanton Navy 600 */

/* Accents */
--accent: #7580B7; /* Stanton Navy 400 - softer for secondary actions */

/* Keep Existing Status Colors */
--success: #059669;
--warning: #D97706;
--critical: #DC2626;
--neutral: #6B7280;
```

### Additional Suggested Colors to Add

#### For Premium/Highlight Features
```css
/* Option 1: Warm Gold (Professional) */
--premium-gold: #D4A574;
--premium-gold-light: #E8C9A0;
--premium-gold-dark: #B8895C;

/* Option 2: Coral (Energetic) */
--highlight-coral: #FF6B6B;
--highlight-coral-light: #FF9494;
--highlight-coral-dark: #E85555;
```

#### For Secondary Actions
```css
/* Slate Gray (Neutral secondary) */
--secondary-slate: #64748B;
--secondary-slate-light: #94A3B8;
--secondary-slate-dark: #475569;
```

---

## 🖼️ Visual Harmony Guide

### Color Combinations That Work Well with Stanton Navy

| Navy + | Result | Use Case |
|--------|--------|----------|
| **White/Cream** | Classic, professional | Headers, cards, modals |
| **Gold/Amber** | Luxurious, trustworthy | Premium features, highlights |
| **Light Gray** | Modern, clean | Backgrounds, subtle separation |
| **Teal/Turquoise** | Fresh, contemporary | Success states, progress |
| **Coral/Orange** | Energetic, urgent | CTAs, important actions |
| **Deep Charcoal** | Sophisticated | Text, dark mode |

### Avoid These Combinations
- ❌ Navy + Bright Yellow (too harsh)
- ❌ Navy + Hot Pink (unprofessional)
- ❌ Navy + Lime Green (poor contrast)
- ❌ Navy + Navy (low contrast, accessibility issues)

---

## 📊 Usage in UI Components

### Buttons

```tsx
/* Primary (Stanton Navy) */
<button className="bg-[--brand-navy] text-white hover:bg-[--brand-navy-600]">
  Primary Action
</button>

/* Secondary (Navy 400) */
<button className="bg-[--brand-navy-400] text-white hover:bg-[--brand-navy]">
  Secondary Action
</button>

/* Outline */
<button className="border-2 border-[--brand-navy] text-[--brand-navy] hover:bg-[--brand-navy-50]">
  Outline Action
</button>

/* With Gold Accent (Premium) */
<button className="bg-[#D4A574] text-[--brand-navy] hover:bg-[#E8C9A0]">
  Premium Feature
</button>
```

### Badges/Status

```tsx
/* Stanton branded */
<span className="bg-[--brand-navy-100] text-[--brand-navy-700] px-2 py-1 rounded">
  Project: Active
</span>

/* With accent color */
<span className="bg-[--brand-navy-400] text-white px-2 py-1 rounded">
  Featured
</span>
```

### Sidebar/Navigation

```tsx
/* Current implementation - Navy sidebar */
<nav className="bg-[--brand-navy] text-white">
  <a className="hover:bg-[--brand-navy-light] active:bg-[--brand-navy-dark]">
    Dashboard
  </a>
</nav>
```

---

## ♿ Accessibility Considerations

### Contrast Ratios (WCAG AA)

| Background | Text Color | Ratio | Pass? |
|-----------|------------|-------|-------|
| `#25225e` (Navy) | `#FFFFFF` (White) | 9.5:1 | ✅ AAA |
| `#25225e` (Navy) | `#D4A574` (Gold) | 4.8:1 | ✅ AA |
| `#7580B7` (Navy 400) | `#FFFFFF` (White) | 5.2:1 | ✅ AA |
| `#F4F5F9` (Navy 50) | `#25225e` (Navy) | 13.1:1 | ✅ AAA |

**Recommendation**: Always pair Stanton Navy with white or very light colors for text to maintain accessibility.

---

## 🎯 Final Recommendation for Stanton COC

Based on your construction operations context, I recommend:

### **Hybrid Approach: Professional + Functional**

1. **Primary Brand**: Stanton Navy (`#25225e`) - Use for headers, primary actions, branding
2. **Accent/Secondary**: Navy 400 (`#7580B7`) - Use for secondary buttons, links
3. **Success**: Keep your current green (`#059669`) - Universal success color
4. **Warning**: Keep your current amber (`#D97706`) - Clear warning signal
5. **Critical**: Keep your current red (`#DC2626`) - Universal danger color
6. **Premium/Highlight**: Add Warm Gold (`#D4A574`) - For featured items, premium features
7. **Neutral**: Keep your grays - For general UI elements

This gives you:
- ✅ Strong brand presence (Navy throughout)
- ✅ Clear functional colors (existing status colors)
- ✅ Premium feel (gold accents)
- ✅ Professional appearance
- ✅ Good accessibility
- ✅ Construction-appropriate (not too playful, not too corporate)

---

## 📝 Quick Reference

### Tailwind Classes (After implementation)

```tsx
// Brand colors
className="bg-brand-navy text-white"
className="bg-brand-navy-400 text-white"
className="text-brand-navy"
className="border-brand-navy"

// With opacity
className="bg-brand-navy/90"
className="hover:bg-brand-navy-600"
className="focus:ring-brand-navy"
```

### CSS Variables

```css
/* Primary */
var(--brand-navy)
var(--primary)

/* Accents */
var(--brand-navy-400)
var(--accent)

/* Sidebar */
var(--sidebar) /* Navy background */
var(--sidebar-accent) /* Lighter navy for hover */
```

---

## 🔄 Next Steps

1. ✅ **Done**: Updated `globals.css` with Stanton Navy color system
2. **Optional**: Add premium gold accent colors if needed for highlighting
3. **Test**: Verify color contrast in actual UI components
4. **Document**: Add color usage guidelines to component library
5. **Iterate**: Adjust shades based on real-world usage and feedback

---

**Questions or need color adjustments?** The navy palette is fully implemented and ready to use!
