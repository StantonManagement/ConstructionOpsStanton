# WINDSURF SYSTEM CONTEXT

## CRITICAL: Database Access
You have direct PostgreSQL access to Supabase. BEFORE creating any table:
1. Query `information_schema.tables` to check if table exists
2. Query `information_schema.columns` to see existing columns
3. Only CREATE if table doesn't exist, otherwise ALTER to add columns

## Application Overview
Construction Operations Center for Stanton Capital. Manages renovations across property portfolios (SREP SOUTHEND, SREP NORTHEND, etc.).

**Core Workflow**: Contractor-payment-centric. Daily question: "which contractor needs to get paid for which projects today?"

**Team**:
- Dean: Field PM - walks units, verifies work, assigns subs
- Alex: Accounting - cash flow, payments, loan draws
- Small team = efficiency over enterprise complexity

## Tech Stack
- Next.js 15 (App Router)
- Supabase (PostgreSQL + Auth + Storage)
- Twilio SMS
- Tailwind + Shadcn UI
- React Query (@tanstack/react-query) for data fetching

---

## FILE NAMING CONVENTIONS

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ProjectCard.tsx`, `StatusBadge.tsx` |
| API Routes | kebab-case folders + `route.ts` | `src/app/api/projects/route.ts` |
| Hooks | camelCase with `use` prefix | `useProjects.ts` |
| Utilities | camelCase | `supabaseClient.ts`, `apiHelpers.ts` |

## FILE LOCATIONS

```
src/
  app/
    api/[resource]/route.ts     # API endpoints
    (dashboard)/[feature]/      # Page components
    components/                 # Feature-specific components (e.g., ConstructionDashboard)
    context/                    # React contexts
  components/
    ui/                         # Atomic UI components (Badge, Button, Card, DataTable)
    [FeatureName].tsx           # Reusable feature components (ProjectCard, StatusBadge)
  hooks/
    queries/                    # React Query hooks (useProjects.ts)
  lib/
    supabaseClient.ts           # Supabase client config
    apiHelpers.ts               # API utilities (withAuth, successResponse, errorResponse)
  types/
    supabase.ts                 # Generated DB types
```

---

## COMPONENT PATTERNS

### Structure (follow `@/components/ProjectCard.tsx`)
```typescript
// 1. Imports - React first, then Types/Context, then UI/Icons
import React from 'react';
import { SomeType } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Building } from 'lucide-react';

// 2. Props - define immediately before component
interface Props {
  project: Project;
  onClick?: () => void;
}

// 3. Component
export function ProjectCard({ project, onClick }: Props) {
  // Helper functions inside component body
  const getStatusInfo = (status: string) => {
    // ...
  };

  return (
    // 4. Styling - Tailwind utility classes only
    <div className="p-4 rounded-lg border bg-white">
      {/* ... */}
    </div>
  );
}
```

### Reusable UI Components
Always check `@/components/ui/` before creating new atomic components:
- `Badge` - status indicators
- `Button` - actions
- `Card` - containers
- `DataTable` - lists/tables

---

## API ROUTE PATTERNS

### Structure (follow `@/app/api/projects/route.ts`)
```typescript
import { NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';
import { supabaseAdmin } from '@/lib/supabaseClient';

export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Database not available', 500, 'DB_ERROR');
    }

    const { data, error } = await supabaseAdmin
      .from('table_name')
      .select('*')
      .eq('some_field', value);

    if (error) throw new APIError(error.message, 500, 'QUERY_ERROR');

    return successResponse({ items: data }, 200);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.status, error.code);
    }
    return errorResponse('Internal server error', 500, 'UNKNOWN');
  }
});

export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json();
    // ... validation and insert logic ...
    return successResponse({ item: created }, 201);
  } catch (error) {
    // ... error handling ...
  }
});
```

### Key Rules
- **Always use `withAuth` wrapper** - handles session validation
- **Always use `supabaseAdmin`** in API routes - bypasses RLS for server operations
- **Use `APIError` class** for typed errors
- **Response helpers**: `successResponse({ data }, status)` and `errorResponse(message, status, code)`

---

## SUPABASE PATTERNS

### Client Configuration (`@/lib/supabaseClient.ts`)
- `supabase` - client-side, uses anon key, RLS restricted
- `supabaseAdmin` - server-side only, uses service role key, bypasses RLS

### Query Pattern
```typescript
const { data, error } = await supabaseAdmin
  .from('projects')
  .select(`
    *,
    contractors (*)
  `)
  .eq('status', 'active')
  .order('created_at', { ascending: false });
```

### Auth/Ownership
- Project data uses `owner_entity_id` to associate with entities
- RLS policies handle data isolation
- No global `tenant_id` pattern currently - check table structure

---

## DATA FETCHING PATTERNS

### USE React Query for new features
Location: `@/hooks/queries/`

```typescript
// hooks/queries/useLocations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useLocations(propertyId: string) {
  return useQuery({
    queryKey: ['locations', propertyId],
    queryFn: async () => {
      const res = await fetch(`/api/locations?property_id=${propertyId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!propertyId,
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateLocationInput) => {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}
```

---

## ANTI-PATTERNS - DO NOT DO THESE

### ❌ DO NOT mix DataContext with React Query
The legacy `DataContext` (`@/app/context/DataContext.tsx`) exists but causes desync issues.
**For new features, use React Query exclusively.**

### ❌ DO NOT access Supabase directly from client components
Always go through API routes to use `supabaseAdmin` and `withAuth`.

### ❌ DO NOT create new utility files without checking existing ones
Check `@/lib/` first - especially `apiHelpers.ts`.

### ❌ DO NOT add new Gantt libraries
Both `frappe-gantt` and `gantt-task-react` exist. Check `src/app/components/schedule/` and follow existing pattern.

### ❌ DO NOT create new atomic UI components
Check `@/components/ui/` first - Badge, Button, Card, DataTable likely cover your needs.

---

## UI CONSTRAINTS

- **Color = signal only**: Gray default, red=critical, orange=warning, blue=interactive
- **Mobile-first**: Field PM uses phone in noisy environments
- **No decoration**: Utilitarian, not pretty
- **Touch targets**: Minimum 44px on mobile
- **Tailwind only**: No custom CSS files