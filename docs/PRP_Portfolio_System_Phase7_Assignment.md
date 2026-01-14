# PRP: Portfolio System — Phase 7: Project Portfolio Assignment

## Objective
Enable assigning projects to portfolios with bulk assignment capability.

---

## Pre-Flight

```bash
# MCP: Check current project form/edit structure
find src -name "*Project*" -type f | grep -E '\.(tsx|ts)$'

# MCP: Verify projects have portfolio_id
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'portfolio_id';
```

---

## 7.1 Update Project Form to Include Portfolio Selection

Locate existing project create/edit form and add portfolio dropdown.

### Expected location: `src/components/ProjectForm.tsx` or similar

Add portfolio selection field:

```typescript
import { usePortfolios } from '@/hooks/queries/usePortfolios';

// Inside the form component:
const { data: portfolios } = usePortfolios();

// In the form JSX:
<div className="space-y-2">
  <Label htmlFor="portfolio">Portfolio</Label>
  <select
    id="portfolio"
    value={portfolioId}
    onChange={(e) => setPortfolioId(e.target.value)}
    className="w-full border rounded-md px-3 py-2"
  >
    <option value="">No portfolio assigned</option>
    {portfolios?.map((p) => (
      <option key={p.id} value={p.id}>
        {p.name} ({p.code})
      </option>
    ))}
  </select>
  <p className="text-xs text-gray-500">
    Assign this project to a portfolio for funding tracking
  </p>
</div>
```

---

## 7.2 Bulk Portfolio Assignment Component

### File: `src/components/BulkPortfolioAssignment.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { usePortfolios } from '@/hooks/queries/usePortfolios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Square, FolderOpen } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  address?: string;
  portfolio_id?: string;
}

interface BulkPortfolioAssignmentProps {
  projects: Project[];
  onAssign: (projectIds: string[], portfolioId: string) => Promise<void>;
  isAssigning?: boolean;
}

export function BulkPortfolioAssignment({
  projects,
  onAssign,
  isAssigning
}: BulkPortfolioAssignmentProps) {
  const { data: portfolios } = usePortfolios();
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [targetPortfolioId, setTargetPortfolioId] = useState<string>('');

  const toggleProject = (id: string) => {
    const newSet = new Set(selectedProjects);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedProjects(newSet);
  };

  const selectAll = () => {
    setSelectedProjects(new Set(projects.map(p => p.id)));
  };

  const selectNone = () => {
    setSelectedProjects(new Set());
  };

  const selectUnassigned = () => {
    setSelectedProjects(new Set(
      projects.filter(p => !p.portfolio_id).map(p => p.id)
    ));
  };

  const handleAssign = async () => {
    if (selectedProjects.size === 0 || !targetPortfolioId) return;
    await onAssign(Array.from(selectedProjects), targetPortfolioId);
    setSelectedProjects(new Set());
    setTargetPortfolioId('');
  };

  const getPortfolioName = (portfolioId?: string) => {
    if (!portfolioId) return null;
    const p = portfolios?.find(p => p.id === portfolioId);
    return p?.code || p?.name;
  };

  const unassignedCount = projects.filter(p => !p.portfolio_id).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          Bulk Portfolio Assignment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick select buttons */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Select:</span>
          <Button variant="ghost" size="sm" onClick={selectAll}>All</Button>
          <Button variant="ghost" size="sm" onClick={selectNone}>None</Button>
          <Button variant="ghost" size="sm" onClick={selectUnassigned}>
            Unassigned ({unassignedCount})
          </Button>
        </div>

        {/* Project list */}
        <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
          {projects.map((project) => (
            <div
              key={project.id}
              className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 ${
                selectedProjects.has(project.id) ? 'bg-blue-50' : ''
              }`}
              onClick={() => toggleProject(project.id)}
            >
              <div className="flex items-center gap-3">
                {selectedProjects.has(project.id) ? (
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                ) : (
                  <Square className="w-5 h-5 text-gray-300" />
                )}
                <div>
                  <p className="font-medium">{project.name}</p>
                  {project.address && (
                    <p className="text-sm text-gray-500">{project.address}</p>
                  )}
                </div>
              </div>
              {project.portfolio_id && (
                <Badge variant="outline">
                  {getPortfolioName(project.portfolio_id)}
                </Badge>
              )}
            </div>
          ))}
        </div>

        {/* Assignment action */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <span className="text-sm text-gray-500">
            Assign {selectedProjects.size} selected to:
          </span>
          <select
            value={targetPortfolioId}
            onChange={(e) => setTargetPortfolioId(e.target.value)}
            className="border rounded-md px-3 py-1.5 text-sm flex-1"
            disabled={selectedProjects.size === 0}
          >
            <option value="">Select portfolio...</option>
            {portfolios?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
          <Button
            onClick={handleAssign}
            disabled={selectedProjects.size === 0 || !targetPortfolioId || isAssigning}
          >
            {isAssigning ? 'Assigning...' : 'Assign'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 7.3 API Endpoint for Bulk Assignment

### File: `src/app/api/projects/bulk-assign-portfolio/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';
import { supabaseAdmin } from '@/lib/supabaseClient';

// POST /api/projects/bulk-assign-portfolio
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Database not available', 500, 'DB_ERROR');
    }

    const body = await request.json();
    const { project_ids, portfolio_id } = body;

    if (!Array.isArray(project_ids) || project_ids.length === 0) {
      throw new APIError('project_ids array is required', 400, 'VALIDATION_ERROR');
    }

    if (!portfolio_id) {
      throw new APIError('portfolio_id is required', 400, 'VALIDATION_ERROR');
    }

    // Verify portfolio exists
    const { data: portfolio, error: portfolioError } = await supabaseAdmin
      .from('portfolios')
      .select('id')
      .eq('id', portfolio_id)
      .single();

    if (portfolioError || !portfolio) {
      throw new APIError('Portfolio not found', 404, 'NOT_FOUND');
    }

    // Update all projects
    const { data, error } = await supabaseAdmin
      .from('projects')
      .update({ portfolio_id })
      .in('id', project_ids)
      .select('id, name, portfolio_id');

    if (error) throw new APIError(error.message, 500, 'UPDATE_ERROR');

    return successResponse({
      updated_count: data?.length || 0,
      projects: data
    }, 200);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.status, error.code);
    }
    return errorResponse('Internal server error', 500, 'UNKNOWN');
  }
});
```

---

## 7.4 Hook for Bulk Assignment

### File: `src/hooks/queries/useProjects.ts` (add mutation)

```typescript
// Add to existing useProjects.ts

interface BulkAssignInput {
  projectIds: string[];
  portfolioId: string;
}

export function useBulkAssignPortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectIds, portfolioId }: BulkAssignInput) => {
      const res = await fetch('/api/projects/bulk-assign-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project_ids: projectIds,
          portfolio_id: portfolioId
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to assign projects');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}
```

---

## 7.5 Projects Page with Assignment UI

Add bulk assignment capability to the projects list page.

### File: `src/app/(dashboard)/projects/page.tsx` (modifications)

```typescript
// Add imports
import { BulkPortfolioAssignment } from '@/components/BulkPortfolioAssignment';
import { useBulkAssignPortfolio } from '@/hooks/queries/useProjects';

// Inside component
const bulkAssignMutation = useBulkAssignPortfolio();
const [showBulkAssign, setShowBulkAssign] = useState(false);

// In JSX, add toggle and component
<div className="flex items-center gap-2">
  <Button
    variant="outline"
    onClick={() => setShowBulkAssign(!showBulkAssign)}
  >
    <FolderOpen className="w-4 h-4 mr-2" />
    {showBulkAssign ? 'Hide' : 'Bulk Assign'}
  </Button>
</div>

{showBulkAssign && projects && (
  <BulkPortfolioAssignment
    projects={projects}
    onAssign={async (projectIds, portfolioId) => {
      await bulkAssignMutation.mutateAsync({ projectIds, portfolioId });
    }}
    isAssigning={bulkAssignMutation.isPending}
  />
)}
```

---

## 7.6 Show Portfolio Badge on Project Cards

Update existing ProjectCard component to show portfolio:

```typescript
// In ProjectCard.tsx or project list items

{project.portfolio && (
  <Badge variant="outline" className="text-xs">
    {project.portfolio.code || project.portfolio.name}
  </Badge>
)}

// Or if only portfolio_id is available, look it up:
{project.portfolio_id && (
  <Badge variant="outline" className="text-xs">
    {getPortfolioCode(project.portfolio_id)}
  </Badge>
)}
```

---

## 7.7 Unassigned Projects Warning

Show a warning when projects exist without portfolio assignment:

```typescript
// In dashboard or projects page
const unassignedProjects = projects?.filter(p => !p.portfolio_id) || [];

{unassignedProjects.length > 0 && (
  <Card className="border-orange-200 bg-orange-50">
    <CardContent className="py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">
            {unassignedProjects.length} project(s) not assigned to a portfolio
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowBulkAssign(true)}
        >
          Assign Now
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

---

## Verification Checklist

```bash
# MCP: Verify files created
ls -la src/components/BulkPortfolioAssignment.tsx
ls -la src/app/api/projects/bulk-assign-portfolio/route.ts
```

```sql
-- MCP: Check projects have portfolio assignments after testing
SELECT 
  p.name as project,
  po.name as portfolio,
  po.code as portfolio_code
FROM projects p
LEFT JOIN portfolios po ON p.portfolio_id = po.id
ORDER BY po.name NULLS FIRST, p.name;
```

Test in browser:
- [ ] Project form shows portfolio dropdown
- [ ] Can assign portfolio when creating new project
- [ ] Can change portfolio when editing project
- [ ] Bulk assignment UI shows all projects
- [ ] Can select multiple projects and assign to portfolio
- [ ] Unassigned count updates after assignment
- [ ] Project cards show portfolio badge
- [ ] Warning appears when projects are unassigned

---

## Stop Gate

Do NOT proceed until:
1. Individual project portfolio assignment works
2. Bulk assignment works
3. All existing projects can be assigned to portfolios
4. Portfolio badges display on project cards
