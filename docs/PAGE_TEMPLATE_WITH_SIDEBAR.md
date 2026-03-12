# Page Template with Sidebar - Standard Layout Pattern

**Date Created:** March 12, 2026
**Purpose:** Template for creating new pages that include the navigation sidebar

---

## Problem

When creating new pages in the app, the sidebar navigation doesn't appear by default. This is because Next.js App Router requires explicit layout wrapping.

---

## Solution: Standard Page Template

Use this template for **ALL new pages** that should include the sidebar navigation.

---

## Template Code

```tsx
"use client";

import { Suspense } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import AppLayout from '@/app/components/AppLayout';
import LoadingAnimation from '@/app/components/LoadingAnimation';

// Import your page component
import YourComponent from '@/app/components/YourComponent';

// Force dynamic rendering (required for authenticated pages)
export const dynamic = 'force-dynamic';

function PageContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  if (!isLoading && !user) {
    router.replace('/');
    return <LoadingAnimation fullScreen />;
  }

  // Show loading state while auth is initializing
  if (isLoading) {
    return <LoadingAnimation fullScreen />;
  }

  // Main content wrapped in AppLayout (includes sidebar)
  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <YourComponent />
        </div>
      </div>
    </AppLayout>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingAnimation fullScreen />}>
      <PageContent />
    </Suspense>
  );
}
```

---

## Step-by-Step Guide

### 1. **Create Your Page File**
Location: `/src/app/[your-route]/page.tsx`

Example:
- `/src/app/daily-logs/page.tsx`
- `/src/app/inventory/page.tsx`
- `/src/app/contractors/page.tsx`

### 2. **Copy Template Code**
Use the template above as your starting point.

### 3. **Customize Imports**
Replace `YourComponent` with your actual component:

```tsx
import DailyLogsView from '@/app/components/DailyLogsView';
```

### 4. **Update Component Usage**
Replace `<YourComponent />` with your component:

```tsx
<DailyLogsView />
```

### 5. **Adjust Container (Optional)**
Modify the wrapper div classes as needed:

```tsx
// Full width page (no max-width)
<div className="min-h-screen bg-background p-8">
  <YourComponent />
</div>

// Centered with max-width (default)
<div className="min-h-screen bg-background">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <YourComponent />
  </div>
</div>

// No padding (full bleed)
<div className="min-h-screen bg-background">
  <YourComponent />
</div>
```

---

## Key Components Explained

### 1. **AppLayout**
```tsx
<AppLayout>
  {children}
</AppLayout>
```

**What it does:**
- Adds the navigation sidebar
- Handles sidebar visibility (hidden on auth pages)
- Adds proper spacing/margin for sidebar on desktop (`lg:ml-64`)
- Mobile-responsive sidebar

**Location:** `/src/app/components/AppLayout.tsx`

### 2. **Authentication Check**
```tsx
const { user, isLoading } = useAuth();

if (!isLoading && !user) {
  router.replace('/');
  return <LoadingAnimation fullScreen />;
}
```

**What it does:**
- Checks if user is authenticated
- Redirects to login if not authenticated
- Shows loading spinner while checking auth

### 3. **Dynamic Rendering**
```tsx
export const dynamic = 'force-dynamic';
```

**What it does:**
- Forces Next.js to render page on-demand (not statically)
- Required for pages that check authentication
- Required for pages using search params or other dynamic data

### 4. **Suspense Wrapper**
```tsx
<Suspense fallback={<LoadingAnimation fullScreen />}>
  <PageContent />
</Suspense>
```

**What it does:**
- Shows loading state during initial page load
- Prevents hydration errors
- Improves user experience

---

## Common Patterns

### Pattern 1: Page with Data Fetching
```tsx
function PageContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    // ... fetch logic
    setLoading(false);
  };

  if (!isLoading && !user) {
    router.replace('/');
    return <LoadingAnimation fullScreen />;
  }

  if (isLoading || loading) {
    return <LoadingAnimation fullScreen />;
  }

  return (
    <AppLayout>
      <YourComponent data={data} />
    </AppLayout>
  );
}
```

### Pattern 2: Page with URL Parameters
```tsx
import { useSearchParams } from 'next/navigation';

function PageContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const projectId = searchParams.get('project');
  const tab = searchParams.get('tab');

  // ... rest of component
}
```

### Pattern 3: Public Page (No Auth Required)
```tsx
function PageContent() {
  // No auth check needed
  return (
    <AppLayout>
      <YourComponent />
    </AppLayout>
  );
}
```

---

## Pages WITHOUT Sidebar

Some pages should NOT have the sidebar:

### 1. **Auth Pages**
- `/auth` - Login page
- `/auth/reset-password` - Password reset

**Pattern:**
```tsx
export default function AuthPage() {
  return (
    <div className="min-h-screen">
      <AuthScreen />
    </div>
  );
}
```

### 2. **Contractor Portal**
- `/contractor-portal/[token]` - External contractor access

**Pattern:**
```tsx
export default function ContractorPortalPage() {
  return (
    <div className="min-h-screen">
      <ContractorPortal />
    </div>
  );
}
```

### 3. **Embedded/Print Views**
- `/reports/print/[id]` - Printable reports
- `/invoices/[id]/pdf` - PDF generation

---

## Troubleshooting

### Problem: Sidebar not showing

**Solution:**
1. ✅ Ensure you wrapped content in `<AppLayout>`
2. ✅ Check that you're not on an auth page (sidebar hidden by default)
3. ✅ Verify `AppLayout` import is correct

### Problem: "useAuth is undefined"

**Solution:**
1. ✅ Verify import: `import { useAuth } from '@/providers/AuthProvider';`
2. ✅ Check that `AuthProvider` is in `layout.tsx`

### Problem: Page is blank

**Solution:**
1. ✅ Check browser console for errors
2. ✅ Verify all imports are correct
3. ✅ Check that component exists at import path
4. ✅ Look for missing return statement

### Problem: Build fails

**Solution:**
1. ✅ Run `npm run build` to see errors
2. ✅ Check for TypeScript errors
3. ✅ Verify all imports exist
4. ✅ Check for missing props

---

## Examples from Codebase

### Example 1: Dashboard Page
**File:** `/src/app/dashboard/page.tsx`

```tsx
return (
  <AppLayout>
    <DataProvider>
      <Suspense fallback={<LoadingAnimation fullScreen />}>
        <DashboardWithLoading />
      </Suspense>
    </DataProvider>
  </AppLayout>
);
```

### Example 2: Daily Logs Page (Fixed)
**File:** `/src/app/daily-logs/page.tsx`

```tsx
return (
  <AppLayout>
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DailyLogsView searchQuery={searchQuery} />
      </div>
    </div>
  </AppLayout>
);
```

### Example 3: Projects Page
**File:** `/src/app/projects/page.tsx`
(Similar pattern)

---

## Quick Checklist

When creating a new page with sidebar:

- [ ] Created page file at `/src/app/[route]/page.tsx`
- [ ] Copied template code
- [ ] Added `"use client";` directive
- [ ] Imported `AppLayout` component
- [ ] Imported `useAuth` hook
- [ ] Imported `LoadingAnimation` component
- [ ] Added `export const dynamic = 'force-dynamic';`
- [ ] Wrapped content in `<AppLayout>`
- [ ] Added authentication check
- [ ] Added loading states
- [ ] Wrapped in `<Suspense>`
- [ ] Tested page loads with sidebar
- [ ] Tested auth redirect works
- [ ] Verified build succeeds (`npm run build`)

---

## File Structure Reference

```
src/app/
├── layout.tsx                 # Root layout (providers only, NO sidebar)
├── page.tsx                   # Homepage (redirects to /dashboard)
├── dashboard/
│   └── page.tsx              # Uses AppLayout ✅
├── daily-logs/
│   ├── page.tsx              # Uses AppLayout ✅ (NEW)
│   ├── [id]/page.tsx         # Uses AppLayout ✅
│   └── new/page.tsx          # Uses AppLayout ✅
├── auth/
│   └── page.tsx              # NO AppLayout ❌ (by design)
└── components/
    ├── AppLayout.tsx         # Sidebar layout wrapper
    ├── Navigation.tsx        # Sidebar navigation component
    └── LoadingAnimation.tsx  # Loading spinner
```

---

## Summary

**Always use this template when creating new authenticated pages.**

**Key Points:**
1. ✅ Wrap content in `<AppLayout>` to show sidebar
2. ✅ Add authentication checks
3. ✅ Use `export const dynamic = 'force-dynamic'`
4. ✅ Wrap in `<Suspense>` for better UX
5. ✅ Test build with `npm run build`

**Remember:** If sidebar isn't showing, you probably forgot `<AppLayout>`.
