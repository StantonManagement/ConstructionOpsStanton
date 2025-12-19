# Coding Conventions — ConstructionOpsStanton

> **Purpose:** Prescriptive rules for AI coding assistants. Follow these patterns exactly. Do not introduce new patterns.

---

## 1. File Naming & Location

### Components
| Type | Location | Naming | Example |
|------|----------|--------|---------|
| UI primitives | `src/components/ui/` | PascalCase | `Button.tsx`, `DataTable.tsx` |
| Domain components | `src/components/` | PascalCase | `ProjectCard.tsx` |
| Feature views | `src/app/components/` | PascalCase + `View` suffix | `UserManagementView.tsx` |
| Subfolders | Any | kebab-case | `punch-list/`, `optimized/` |

### API Routes
- Location: `src/app/api/[resource]/route.ts`
- Folders: **kebab-case**
- Dynamic segments: `[id]`
- File: always `route.ts`

```
✅ src/app/api/users/route.ts
✅ src/app/api/users/reset-password/route.ts
✅ src/app/api/projects/[id]/route.ts
❌ src/app/api/resetPassword/route.ts
```

### Pages
- Always `src/app/**/page.tsx`

---

## 2. Component Structure

### Standard Template
Follow this exact order:

```tsx
'use client';

// 1. External imports
import React, { memo, useCallback } from 'react';
import { IconName } from 'lucide-react';

// 2. UI components
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// 3. Types
import type { Project, Subcontractor } from '@/types/schema';

// 4. Hooks/utils
import { useProjects } from '@/hooks/queries/useProjects';

// 5. Props interface
interface ComponentNameProps {
  project: Project;
  onAction?: (project: Project) => void;
  className?: string;
}

// 6. Component
const ComponentName = memo<ComponentNameProps>(({ project, onAction, className = '' }) => {
  // hooks first
  // handlers next
  // return JSX
});

// 7. Display name
ComponentName.displayName = 'ComponentName';

// 8. Export
export default ComponentName;
```

### UI Components — Use Existing
**Do not create new UI primitives.** Use `src/components/ui/`:

| Need | Import from |
|------|-------------|
| Buttons | `@/components/ui/button` |
| Form inputs | `@/components/ui/input`, `label`, `select`, `textarea`, `checkbox` |
| Modals | `@/components/ui/dialog` |
| Tables | `@/components/ui/DataTable` |
| Status badges | `@/components/ui/SignalBadge` |
| Cards | `@/components/ui/card` |
| Tabs | `@/components/ui/tabs` |
| Loading | `@/components/ui/skeleton`, `LoadingSkeleton` |

---

## 3. TypeScript Types

### Single Source of Truth
**All shared types live in `src/types/schema.ts`**

```typescript
// ✅ CORRECT
import type { Project, Subcontractor, Contract } from '@/types/schema';

// ❌ WRONG - do not redefine
interface Project { ... }
```

### Props Interfaces
Define in the same file as the component:

```typescript
interface ContractorCardProps {
  contractor: Subcontractor;  // from schema
  onEdit?: (contractor: Subcontractor) => void;
}
```

---

## 4. Data Fetching

### DECISION: React Query for New Features

**Use React Query hooks in `src/hooks/queries/`:**

```typescript
// ✅ CORRECT - React Query
import { useProjects } from '@/hooks/queries/useProjects';

function MyComponent() {
  const { data: projects, isLoading, error } = useProjects();
}
```

**DataContext is for dashboard bulk load only.** Do not extend it for new features.

**Do not add these patterns in new code:**
```typescript
// ❌ WRONG - component-local fetch
useEffect(() => {
  fetch('/api/projects').then(...)
}, []);

// ❌ WRONG - extending DataContext for new features
const { newThing } = useData();
```

### Creating New Query Hooks

Add to `src/hooks/queries/`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { Resource } from '@/types/schema';

export const resourceKeys = {
  all: ['resources'] as const,
  list: () => [...resourceKeys.all, 'list'] as const,
  detail: (id: string) => [...resourceKeys.all, 'detail', id] as const,
};

export function useResources() {
  return useQuery({
    queryKey: resourceKeys.list(),
    queryFn: async (): Promise<Resource[]> => {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });
}
```

---

## 5. API Routes

### Structure

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    // 1. Service check
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    // 2. Auth check
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 3. Business logic
    const { data, error } = await supabaseAdmin
      .from('table_name')
      .select('*');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 4. Success
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### DECISION: Response Format

```typescript
// Success
{ success: true, data: T }
{ success: true, data: T[], count?: number }

// Error
{ error: string }
```

### Status Codes
| Situation | Code |
|-----------|------|
| Success | 200 |
| Created | 201 |
| Bad request | 400 |
| Unauthorized | 401 |
| Forbidden | 403 |
| Not found | 404 |
| Conflict | 409 |
| Rate limited | 429 |
| Server error | 500 |
| Service unavailable | 503 |

---

## 6. Supabase Client

### DECISION: Always Import from lib

```typescript
// ✅ CORRECT
import { supabase } from '@/lib/supabaseClient';        // Client-side
import { supabaseAdmin } from '@/lib/supabaseClient';  // Server-side
```

```typescript
// ❌ WRONG - never create inline
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, key);
```

| Context | Use |
|---------|-----|
| Client components | `supabase` |
| API routes | `supabaseAdmin` |
| Server components | `supabaseAdmin` |

---

## 7. Error Handling

### In Components
```typescript
const { data, isLoading, error } = useProjects();

if (error) {
  return <div className="text-red-600">Failed to load projects</div>;
}

if (isLoading) {
  return <LoadingSkeleton />;
}
```

### In Async Handlers
```typescript
const handleSubmit = async () => {
  try {
    setIsSubmitting(true);
    await someAsyncOperation();
  } catch (error) {
    console.error('Operation failed:', error);
    // show user feedback
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## 8. Anti-Patterns — DO NOT

### Types
- ❌ Redefine `Project`, `Subcontractor`, `Contract` — import from `@/types/schema`
- ❌ Use `any` — use `unknown` and narrow, or define proper types

### Data Fetching
- ❌ Add new `useEffect` + `fetch` patterns
- ❌ Extend DataContext for new features
- ❌ Call APIs in event handlers without error handling

### Components
- ❌ Create new UI primitives — use `src/components/ui/`
- ❌ Define hooks inside components — extract to `src/hooks/`
- ❌ Use inline styles — use Tailwind

### API Routes
- ❌ Create inline Supabase clients
- ❌ Return bare data — wrap in `{ success: true, data }` or `{ error }`
- ❌ Skip auth checks on protected routes

### General
- ❌ Add npm packages without checking existing ones
- ❌ Create new folders at `src/` level
- ❌ Duplicate logic — check `src/lib/` first

---

## 9. Reference Files

| Task | Reference |
|------|-----------|
| Memoized component | `src/components/optimized/OptimizedContractorCard.tsx` |
| Feature view | `src/app/components/EntityManagementView.tsx` |
| API route with auth | `src/app/api/users/route.ts` |
| React Query hook | `src/hooks/queries/useProjects.ts` |
| Supabase client | `src/lib/supabaseClient.ts` |
| Shared types | `src/types/schema.ts` |

---

## 10. Checklist

Before submitting code:

- [ ] Types from `@/types/schema`, not redefined
- [ ] Supabase from `@/lib/supabaseClient`
- [ ] Data fetching uses React Query
- [ ] UI uses `src/components/ui/`
- [ ] API routes follow standard structure
- [ ] Error states handled
- [ ] Tailwind only, no inline styles
- [ ] `displayName` set for memo components