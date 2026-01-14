# PRP: Portfolio System — Phase 4: Portfolio Management UI

## Objective
Create portfolio list and detail pages for managing portfolios.

---

## Pre-Flight

```bash
# MCP: Check current dashboard page structure
ls -la src/app/\(dashboard\)/

# MCP: Reference existing list page pattern
ls -la src/app/\(dashboard\)/projects/
```

---

## 4.1 Portfolios List Page

### File: `src/app/(dashboard)/portfolios/page.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePortfolios } from '@/hooks/queries/usePortfolios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, DollarSign, FolderOpen, ChevronRight } from 'lucide-react';

export default function PortfoliosPage() {
  const router = useRouter();
  const [showInactive, setShowInactive] = useState(false);
  const { data: portfolios, isLoading, error } = usePortfolios({ activeOnly: !showInactive });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error loading portfolios: {error.message}
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Portfolios</h1>
          <p className="text-gray-500 mt-1">Manage your property portfolios and funding sources</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show inactive
          </label>
          <Button onClick={() => router.push('/portfolios/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New Portfolio
          </Button>
        </div>
      </div>

      {/* Portfolio Cards */}
      {portfolios?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No portfolios yet</h3>
            <p className="text-gray-500 mb-4">Create your first portfolio to start organizing projects and funding sources.</p>
            <Button onClick={() => router.push('/portfolios/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Portfolio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {portfolios?.map((portfolio) => (
            <Card
              key={portfolio.id}
              className="cursor-pointer hover:border-blue-300 transition-colors"
              onClick={() => router.push(`/portfolios/${portfolio.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{portfolio.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{portfolio.code}</p>
                  </div>
                  {!portfolio.is_active && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {portfolio.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{portfolio.description}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      <span className="font-medium">{portfolio.totals?.projects || 0}</span>
                      <span className="text-gray-500"> projects</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      <span className="font-medium">{portfolio.totals?.funding_sources || 0}</span>
                      <span className="text-gray-500"> sources</span>
                    </span>
                  </div>
                </div>

                {/* Funding Summary */}
                {(portfolio.totals?.commitment || 0) > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Commitment</span>
                      <span className="font-medium">{formatCurrency(portfolio.totals?.commitment || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Drawn</span>
                      <span className="font-medium">{formatCurrency(portfolio.totals?.drawn || 0)}</span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${Math.min(100, ((portfolio.totals?.drawn || 0) / (portfolio.totals?.commitment || 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Click indicator */}
                <div className="flex items-center justify-end text-blue-600 text-sm">
                  View details
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 4.2 Portfolio Detail Page

### File: `src/app/(dashboard)/portfolios/[id]/page.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { usePortfolio, useUpdatePortfolio, useDeletePortfolio } from '@/hooks/queries/usePortfolios';
import { useFundingSources } from '@/hooks/queries/useFundingSources';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Edit, Trash2, Plus, Building2, DollarSign,
  AlertTriangle, ChevronRight
} from 'lucide-react';

export default function PortfolioDetailPage() {
  const router = useRouter();
  const params = useParams();
  const portfolioId = params.id as string;

  const { data: portfolio, isLoading, error } = usePortfolio(portfolioId);
  const { data: fundingSources } = useFundingSources({ portfolioId });
  const updateMutation = useUpdatePortfolio();
  const deleteMutation = useDeletePortfolio();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(portfolioId);
      router.push('/portfolios');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'loan': return 'bg-blue-100 text-blue-800';
      case 'grant': return 'bg-green-100 text-green-800';
      case 'equity': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-40 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error?.message || 'Portfolio not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/portfolios')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-gray-900">{portfolio.name}</h1>
              {!portfolio.is_active && <Badge variant="secondary">Inactive</Badge>}
            </div>
            <p className="text-gray-500">{portfolio.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push(`/portfolios/${portfolioId}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="text-red-600 hover:bg-red-50"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-red-800">Are you sure you want to delete this portfolio?</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Description */}
      {portfolio.description && (
        <Card>
          <CardContent className="py-4">
            <p className="text-gray-600">{portfolio.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Funding Sources Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Funding Sources</h2>
          <Button onClick={() => router.push(`/funding-sources/new?portfolio_id=${portfolioId}`)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Funding Source
          </Button>
        </div>

        {fundingSources?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <DollarSign className="w-10 h-10 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 mb-4">No funding sources yet</p>
              <Button
                variant="outline"
                onClick={() => router.push(`/funding-sources/new?portfolio_id=${portfolioId}`)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Funding Source
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {fundingSources?.map((fs) => (
              <Card
                key={fs.id}
                className="cursor-pointer hover:border-blue-300 transition-colors"
                onClick={() => router.push(`/funding-sources/${fs.id}`)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={getTypeColor(fs.type)}>{fs.type}</Badge>
                      <div>
                        <p className="font-medium">{fs.name}</p>
                        {fs.lender_name && (
                          <p className="text-sm text-gray-500">{fs.lender_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Commitment</p>
                        <p className="font-medium">{formatCurrency(fs.commitment_amount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Remaining</p>
                        <p className="font-medium">{formatCurrency(fs.remaining || 0)}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Projects Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Projects</h2>
          <Button variant="outline" onClick={() => router.push('/projects')}>
            Manage Projects
          </Button>
        </div>

        {portfolio.projects?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Building2 className="w-10 h-10 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">No projects assigned to this portfolio</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {portfolio.projects?.map((project: any) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:border-blue-300 transition-colors"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{project.name}</p>
                      {project.address && (
                        <p className="text-sm text-gray-500">{project.address}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {project.status && (
                        <Badge variant="outline">{project.status}</Badge>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 4.3 Create/Edit Portfolio Page

### File: `src/app/(dashboard)/portfolios/new/page.tsx`

```typescript
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCreatePortfolio } from '@/hooks/queries/usePortfolios';
import { PortfolioForm } from '@/components/PortfolioForm';

export default function NewPortfolioPage() {
  const router = useRouter();
  const createMutation = useCreatePortfolio();

  const handleSubmit = async (data: any) => {
    try {
      const portfolio = await createMutation.mutateAsync(data);
      router.push(`/portfolios/${portfolio.id}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Create Portfolio</h1>
      <PortfolioForm
        onSubmit={handleSubmit}
        onCancel={() => router.push('/portfolios')}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}
```

### File: `src/app/(dashboard)/portfolios/[id]/edit/page.tsx`

```typescript
'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { usePortfolio, useUpdatePortfolio } from '@/hooks/queries/usePortfolios';
import { PortfolioForm } from '@/components/PortfolioForm';

export default function EditPortfolioPage() {
  const router = useRouter();
  const params = useParams();
  const portfolioId = params.id as string;

  const { data: portfolio, isLoading } = usePortfolio(portfolioId);
  const updateMutation = useUpdatePortfolio();

  const handleSubmit = async (data: any) => {
    try {
      await updateMutation.mutateAsync({ id: portfolioId, ...data });
      router.push(`/portfolios/${portfolioId}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Portfolio</h1>
      <PortfolioForm
        initialData={portfolio}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/portfolios/${portfolioId}`)}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}
```

---

## 4.4 Portfolio Form Component

### File: `src/components/PortfolioForm.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface PortfolioFormProps {
  initialData?: {
    name?: string;
    code?: string;
    description?: string;
    is_active?: boolean;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function PortfolioForm({ initialData, onSubmit, onCancel, isSubmitting }: PortfolioFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name,
      code: code || undefined,
      description: description || undefined,
      is_active: isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Portfolio Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., SREP Southend"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Short Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., SREP-SE"
              maxLength={20}
            />
            <p className="text-xs text-gray-500">
              Auto-generated from name if left blank
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this portfolio"
              rows={3}
            />
          </div>

          {initialData && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="font-normal">
                Portfolio is active
              </Label>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !name}>
          {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Create Portfolio'}
        </Button>
      </div>
    </form>
  );
}
```

---

## Verification Checklist

```bash
# MCP: Verify files created
ls -la src/app/\(dashboard\)/portfolios/
ls -la src/app/\(dashboard\)/portfolios/\[id\]/
ls -la src/components/PortfolioForm.tsx
```

Test in browser:
- [ ] /portfolios shows list of portfolios
- [ ] /portfolios/new creates new portfolio
- [ ] /portfolios/[id] shows detail with funding sources and projects
- [ ] /portfolios/[id]/edit updates portfolio
- [ ] Delete works (with dependency check)
- [ ] Empty states display correctly
- [ ] Loading states display correctly
- [ ] Error states display correctly

---

## Stop Gate

Do NOT proceed to Phase 5 until:
1. All portfolio pages created and working
2. Navigation to/from pages works
3. CRUD operations functional
