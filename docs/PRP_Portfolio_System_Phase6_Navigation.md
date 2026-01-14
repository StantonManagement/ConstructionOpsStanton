# PRP: Portfolio System — Phase 6: Navigation Integration

## Objective
Integrate portfolios into the navigation with a functional portfolio filter that persists across the app.

---

## Pre-Flight

```bash
# MCP: Find the navigation component
find src -name "Navigation.tsx" -o -name "Navbar.tsx" -o -name "Sidebar.tsx" 2>/dev/null

# MCP: Check current navigation structure
cat src/app/components/Navigation.tsx | head -100
```

---

## 6.1 Portfolio Context for App-Wide State

### File: `src/context/PortfolioContext.tsx`

```typescript
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PortfolioContextValue {
  selectedPortfolioId: string | null;
  setSelectedPortfolioId: (id: string | null) => void;
  clearPortfolioFilter: () => void;
  isHydrated: boolean;
}

const PortfolioContext = createContext<PortfolioContextValue | undefined>(undefined);

const STORAGE_KEY = 'selectedPortfolioId';

export function PortfolioProvider({ children }: { children: ReactNode }) {
  // Start with null - will be populated from localStorage after hydration
  const [selectedPortfolioId, setSelectedPortfolioIdState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage AFTER initial render to avoid hydration mismatch
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored !== 'null') {
      setSelectedPortfolioIdState(stored);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage on change (only after hydration)
  const setSelectedPortfolioId = (id: string | null) => {
    setSelectedPortfolioIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const clearPortfolioFilter = () => {
    setSelectedPortfolioId(null);
  };

  // Always render children - use isHydrated flag for components that need localStorage value
  return (
    <PortfolioContext.Provider
      value={{
        selectedPortfolioId,
        setSelectedPortfolioId,
        clearPortfolioFilter,
        isHydrated,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolioContext() {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolioContext must be used within a PortfolioProvider');
  }
  return context;
}
```

---

## 6.2 Add Provider to Root Layout

### File: `src/app/layout.tsx` (modification)

Find where providers are wrapped and add PortfolioProvider:

```typescript
import { PortfolioProvider } from '@/context/PortfolioContext';

// In the layout component, wrap children:
<PortfolioProvider>
  {/* existing providers and children */}
</PortfolioProvider>
```

---

## 6.3 Portfolio Selector Component

### File: `src/components/PortfolioSelector.tsx`

```typescript
'use client';

import React from 'react';
import { usePortfolios } from '@/hooks/queries/usePortfolios';
import { usePortfolioContext } from '@/context/PortfolioContext';
import { FolderOpen, X } from 'lucide-react';

interface PortfolioSelectorProps {
  className?: string;
}

export function PortfolioSelector({ className }: PortfolioSelectorProps) {
  const { data: portfolios, isLoading } = usePortfolios();
  const { selectedPortfolioId, setSelectedPortfolioId, clearPortfolioFilter, isHydrated } = usePortfolioContext();

  const selectedPortfolio = portfolios?.find(p => p.id === selectedPortfolioId);

  // Show loading state during initial load or before hydration
  if (isLoading || !isHydrated) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 ${className}`}>
        <FolderOpen className="w-4 h-4 text-gray-400" />
        <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <FolderOpen className="w-4 h-4 text-gray-400" />
      <select
        value={selectedPortfolioId || ''}
        onChange={(e) => setSelectedPortfolioId(e.target.value || null)}
        className="bg-transparent border-none text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer min-w-[140px]"
      >
        <option value="">All Portfolios</option>
        {portfolios?.map((p) => (
          <option key={p.id} value={p.id}>
            {p.code || p.name}
          </option>
        ))}
      </select>
      {selectedPortfolioId && (
        <button
          onClick={clearPortfolioFilter}
          className="p-1 hover:bg-gray-100 rounded"
          title="Clear filter"
        >
          <X className="w-3 h-3 text-gray-400" />
        </button>
      )}
    </div>
  );
}
```

---

## 6.4 Update Navigation Component

### File: `src/app/components/Navigation.tsx` (modifications)

Add imports at top:
```typescript
import { PortfolioSelector } from '@/components/PortfolioSelector';
```

Add Portfolios to nav items:
```typescript
// In nav items array, add:
{
  name: 'Portfolios',
  href: '/portfolios',
  icon: FolderOpen, // import from lucide-react
}
```

Add PortfolioSelector in header area (near user profile or in a toolbar):
```typescript
<PortfolioSelector className="mr-4" />
```

Replace hardcoded portfolio dropdown (lines ~209-216) with the PortfolioSelector component.

---

## 6.5 Hook to Use Portfolio Filter in Queries

### File: `src/hooks/usePortfolioFilter.ts`

```typescript
import { usePortfolioContext } from '@/context/PortfolioContext';

/**
 * Hook to get the current portfolio filter for use in queries.
 * Returns undefined if no portfolio is selected (fetch all).
 */
export function usePortfolioFilter() {
  const { selectedPortfolioId } = usePortfolioContext();
  return selectedPortfolioId || undefined;
}
```

---

## 6.6 Update Existing Hooks to Use Portfolio Filter

Modify hooks that should respect the portfolio filter. Example for projects:

### File: `src/hooks/queries/useProjects.ts` (modification)

```typescript
import { usePortfolioFilter } from '@/hooks/usePortfolioFilter';

export function useProjects() {
  const portfolioId = usePortfolioFilter();

  return useQuery({
    queryKey: ['projects', { portfolioId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (portfolioId) {
        params.set('portfolio_id', portfolioId);
      }

      const res = await fetch(`/api/projects?${params}`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      return data.projects || data;
    },
  });
}
```

---

## 6.7 Update Projects API to Support Portfolio Filter

### File: `src/app/api/projects/route.ts` (modification)

In the GET handler, add portfolio filter support:

```typescript
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolio_id');

    let query = supabaseAdmin
      .from('projects')
      .select('*')
      .order('name');

    // Apply portfolio filter if provided
    if (portfolioId) {
      query = query.eq('portfolio_id', portfolioId);
    }

    const { data, error } = await query;

    if (error) throw new APIError(error.message, 500, 'QUERY_ERROR');

    return successResponse({ projects: data }, 200);
  } catch (error) {
    // ... error handling
  }
});
```

---

## 6.8 Navigation Structure Update

The nav should now include:

**Main Navigation:**
- Dashboard
- Projects (filtered by portfolio)
- Portfolios (NEW - management page)
- Cash Position (already portfolio-aware)
- Funding Sources (NEW - can be accessed from Portfolios or standalone)
- Payments
- Contractors (global, not portfolio-filtered)
- Schedule

**Header/Toolbar:**
- PortfolioSelector dropdown (persists filter across pages)

---

## 6.9 Visual Indicator When Filter Active

When a portfolio is selected, show an indicator in the nav or header:

```typescript
// In Navigation.tsx, add visual indicator
{selectedPortfolioId && selectedPortfolio && (
  <div className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full flex items-center gap-1">
    <FolderOpen className="w-3 h-3" />
    {selectedPortfolio.code}
    <button onClick={clearPortfolioFilter} className="ml-1 hover:text-blue-900">
      <X className="w-3 h-3" />
    </button>
  </div>
)}
```

---

## Verification Checklist

```bash
# MCP: Verify new files created
ls -la src/context/PortfolioContext.tsx
ls -la src/components/PortfolioSelector.tsx
ls -la src/hooks/usePortfolioFilter.ts
```

Test in browser:
- [ ] PortfolioSelector appears in navigation header
- [ ] Selecting a portfolio persists on page refresh
- [ ] "All Portfolios" clears the filter
- [ ] X button clears the filter
- [ ] Projects list filters when portfolio selected
- [ ] Cash Position respects portfolio filter
- [ ] Navigating to /portfolios shows management page
- [ ] Visual indicator shows when filter is active
- [ ] Contractors page is NOT filtered (global)

---

## Integration Points to Update

These pages/components should respect the portfolio filter:

| Page | Should Filter? | Notes |
|------|----------------|-------|
| Projects | Yes | Only show projects in selected portfolio |
| Cash Position | Yes | Already portfolio-aware |
| Funding Sources | Yes | Filter to selected portfolio |
| Loan Draws | Yes | Through funding source → portfolio |
| Payments | Maybe | Depends on your workflow |
| Contractors | No | Global across all portfolios |
| Schedule/Gantt | Maybe | Depends if task-level or project-level |

---

## Stop Gate

Do NOT proceed to Phase 7 until:
1. PortfolioContext implemented and provider added to layout
2. PortfolioSelector working in navigation
3. Filter persists across page navigation
4. At least Projects list respects the filter
5. No hydration errors or console warnings
