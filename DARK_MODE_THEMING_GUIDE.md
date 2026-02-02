# Dark Mode Theming Guide

## Overview
This project uses semantic color tokens defined in `src/app/globals.css` that automatically adapt to light/dark mode. **Never use hardcoded colors** - always use these tokens.

## Color Token Reference

### Background Colors
| Token | Usage | Example |
|-------|-------|---------|
| `bg-background` | Main page background | `<div className="bg-background">` |
| `bg-card` | Card/panel backgrounds | `<div className="bg-card">` |
| `bg-popover` | Popover/dropdown backgrounds | `<div className="bg-popover">` |
| `bg-muted` | Muted/subtle backgrounds | `<div className="bg-muted">` |
| `bg-secondary` | Secondary buttons/elements | `<button className="bg-secondary">` |
| `bg-primary` | Primary buttons/accents | `<button className="bg-primary">` |
| `bg-destructive` | Delete/danger buttons | `<button className="bg-destructive">` |
| `bg-accent` | Accent highlights | `<div className="bg-accent">` |

### Text Colors
| Token | Usage | Example |
|-------|-------|---------|
| `text-foreground` | Primary text | `<h1 className="text-foreground">` |
| `text-card-foreground` | Text on cards | `<p className="text-card-foreground">` |
| `text-muted-foreground` | Secondary/muted text | `<span className="text-muted-foreground">` |
| `text-primary` | Primary color text | `<span className="text-primary">` |
| `text-primary-foreground` | Text on primary backgrounds | `<span className="text-primary-foreground">` |
| `text-destructive` | Error/danger text | `<span className="text-destructive">` |

### Border Colors
| Token | Usage | Example |
|-------|-------|---------|
| `border-border` | Standard borders | `<div className="border border-border">` |
| `border-input` | Input field borders | `<input className="border-input">` |
| `border-primary` | Primary colored borders | `<div className="border-primary">` |
| `border-destructive` | Error borders | `<div className="border-destructive">` |

## Status Colors (with Dark Mode)

For status colors, use opacity-based approach:

```tsx
// Success
<div className="bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400">
  Success message
</div>

// Error
<div className="bg-destructive/10 border border-destructive/20 text-destructive">
  Error message
</div>

// Warning
<div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400">
  Warning message
</div>

// Info
<div className="bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400">
  Info message
</div>
```

## Common Replacements

### ❌ Don't Use (Hardcoded)
```tsx
bg-white → bg-card
bg-gray-50 → bg-muted
bg-gray-100 → bg-secondary
bg-gray-200 → bg-muted

text-gray-900 → text-foreground / text-card-foreground
text-gray-800 → text-foreground
text-gray-700 → text-foreground
text-gray-600 → text-muted-foreground
text-gray-500 → text-muted-foreground
text-gray-400 → text-muted-foreground

border-gray-200 → border-border
border-gray-300 → border-border

bg-blue-50 → bg-primary/10
bg-blue-100 → bg-primary/10
text-blue-700 → text-primary
```

### ✅ Do Use (Semantic)
```tsx
// Backgrounds
<div className="bg-card"> // For cards/panels
<div className="bg-background"> // For page backgrounds
<div className="bg-muted"> // For subtle backgrounds

// Text
<h1 className="text-foreground"> // For headings
<p className="text-card-foreground"> // For content in cards
<span className="text-muted-foreground"> // For secondary text

// Borders
<div className="border border-border"> // For standard borders

// Buttons
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
<button className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
<button className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
```

## Reusable Components

Use these pre-built components instead of creating custom ones:

### Alert Component
```tsx
import { Alert } from '@/components/ui/Alert';

<Alert variant="success">Operation completed successfully</Alert>
<Alert variant="error">An error occurred</Alert>
<Alert variant="warning">Warning message</Alert>
<Alert variant="info">Information message</Alert>
```

### Card Components
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
  <CardFooter>
    Footer content
  </CardFooter>
</Card>
```

### Button Component
```tsx
import { Button } from '@/components/ui/Button';

<Button variant="default">Primary Button</Button>
<Button variant="secondary">Secondary Button</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
```

## Finding Hardcoded Colors

Run this command to find files with hardcoded colors:

```bash
# Find all files with hardcoded colors
grep -r "bg-white\|bg-gray-\|text-gray-\|border-gray-" src/app/components --include="*.tsx" -l

# Count hardcoded instances in a specific file
grep -c "bg-white\|bg-gray-\|text-gray-\|border-gray-" src/app/components/YourComponent.tsx
```

## Best Practices

1. **Always use semantic tokens** - Never hardcode `gray-*`, `white`, or specific color values
2. **Use reusable components** - Import Alert, Card, Button instead of creating custom ones
3. **Test in both modes** - Always check your changes in both light and dark mode
4. **Opacity for colors** - Use `/10`, `/20` opacity for subtle colored backgrounds
5. **Dark mode variants** - Use `dark:` prefix when you need different colors in dark mode

## Examples

### Before (❌ Hardcoded)
```tsx
<div className="bg-white rounded-lg border border-gray-200 p-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">Title</h3>
  <p className="text-gray-600">Description text</p>
  <button className="bg-blue-600 text-white px-4 py-2 rounded">
    Click me
  </button>
</div>
```

### After (✅ Semantic)
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description text</CardDescription>
  </CardHeader>
  <CardContent>
    <Button>Click me</Button>
  </CardContent>
</Card>
```

Or without components:
```tsx
<div className="bg-card rounded-lg border border-border p-6">
  <h3 className="text-lg font-semibold text-card-foreground mb-4">Title</h3>
  <p className="text-muted-foreground">Description text</p>
  <button className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90">
    Click me
  </button>
</div>
```

## Quick Fix Checklist

When fixing a component:

- [ ] Replace `bg-white` with `bg-card`
- [ ] Replace `bg-gray-*` with `bg-muted` or `bg-secondary`
- [ ] Replace `text-gray-900/800/700` with `text-foreground` or `text-card-foreground`
- [ ] Replace `text-gray-600/500/400` with `text-muted-foreground`
- [ ] Replace `border-gray-*` with `border-border`
- [ ] Replace hardcoded blue/green/red with semantic tokens or Alert component
- [ ] Add `dark:` variants where colors need to differ in dark mode
- [ ] Test in both light and dark mode
