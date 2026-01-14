# PRP: Portfolio System — Phase 5: Funding Sources Management UI

## Objective
Create funding source list, detail, and create/edit pages.

---

## Pre-Flight

```bash
# MCP: Check if funding-sources route folder exists in dashboard
ls -la src/app/\(dashboard\)/funding-sources/ 2>/dev/null || echo "Does not exist yet"
```

---

## 5.1 Funding Sources List Page

### File: `src/app/(dashboard)/funding-sources/page.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFundingSources } from '@/hooks/queries/useFundingSources';
import { usePortfolios } from '@/hooks/queries/usePortfolios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, ChevronRight, Filter } from 'lucide-react';

export default function FundingSourcesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [portfolioFilter, setPortfolioFilter] = useState<string>(
    searchParams.get('portfolio_id') || ''
  );
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);

  const { data: portfolios } = usePortfolios();
  const { data: fundingSources, isLoading, error } = useFundingSources({
    portfolioId: portfolioFilter || undefined,
    type: typeFilter as any || undefined,
    activeOnly: !showInactive,
  });

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

  const getUtilization = (fs: any) => {
    if (!fs.commitment_amount) return 0;
    return Math.round((fs.drawn_amount / fs.commitment_amount) * 100);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg" />
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
          Error loading funding sources: {error.message}
        </div>
      </div>
    );
  }

  // Group by portfolio
  const grouped = fundingSources?.reduce((acc: any, fs) => {
    const key = fs.portfolio?.id || 'unassigned';
    if (!acc[key]) {
      acc[key] = {
        portfolio: fs.portfolio,
        sources: []
      };
    }
    acc[key].sources.push(fs);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Funding Sources</h1>
          <p className="text-gray-500 mt-1">Manage loans, grants, and equity across portfolios</p>
        </div>
        <Button onClick={() => router.push('/funding-sources/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Funding Source
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">Filter:</span>
            </div>

            <select
              value={portfolioFilter}
              onChange={(e) => setPortfolioFilter(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm"
            >
              <option value="">All Portfolios</option>
              {portfolios?.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm"
            >
              <option value="">All Types</option>
              <option value="loan">Loan</option>
              <option value="grant">Grant</option>
              <option value="equity">Equity</option>
              <option value="other">Other</option>
            </select>

            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300"
              />
              Show inactive
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Funding Sources List */}
      {fundingSources?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No funding sources</h3>
            <p className="text-gray-500 mb-4">Add your first loan, grant, or equity source.</p>
            <Button onClick={() => router.push('/funding-sources/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Funding Source
            </Button>
          </CardContent>
        </Card>
      ) : portfolioFilter ? (
        // Flat list when filtered
        <div className="space-y-3">
          {fundingSources?.map((fs) => (
            <FundingSourceCard
              key={fs.id}
              fundingSource={fs}
              onClick={() => router.push(`/funding-sources/${fs.id}`)}
              formatCurrency={formatCurrency}
              getTypeColor={getTypeColor}
              getUtilization={getUtilization}
            />
          ))}
        </div>
      ) : (
        // Grouped by portfolio
        <div className="space-y-6">
          {Object.entries(grouped || {}).map(([key, group]: [string, any]) => (
            <div key={key}>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                {group.portfolio?.name || 'Unassigned'}
                {group.portfolio?.code && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({group.portfolio.code})
                  </span>
                )}
              </h3>
              <div className="space-y-3">
                {group.sources.map((fs: any) => (
                  <FundingSourceCard
                    key={fs.id}
                    fundingSource={fs}
                    onClick={() => router.push(`/funding-sources/${fs.id}`)}
                    formatCurrency={formatCurrency}
                    getTypeColor={getTypeColor}
                    getUtilization={getUtilization}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Sub-component for funding source card
function FundingSourceCard({
  fundingSource: fs,
  onClick,
  formatCurrency,
  getTypeColor,
  getUtilization
}: any) {
  const utilization = getUtilization(fs);

  return (
    <Card
      className="cursor-pointer hover:border-blue-300 transition-colors"
      onClick={onClick}
    >
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className={getTypeColor(fs.type)}>{fs.type}</Badge>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{fs.name}</p>
                {!fs.is_active && <Badge variant="secondary">Inactive</Badge>}
              </div>
              {fs.lender_name && (
                <p className="text-sm text-gray-500">{fs.lender_name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-xs text-gray-500">Commitment</p>
              <p className="font-medium">{formatCurrency(fs.commitment_amount)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Drawn</p>
              <p className="font-medium">{formatCurrency(fs.drawn_amount)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Remaining</p>
              <p className="font-medium">{formatCurrency(fs.remaining || 0)}</p>
            </div>
            <div className="w-24">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Used</span>
                <span>{utilization}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    utilization > 90 ? 'bg-orange-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, utilization)}%` }}
                />
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 5.2 Funding Source Detail Page

### File: `src/app/(dashboard)/funding-sources/[id]/page.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFundingSource, useDeleteFundingSource } from '@/hooks/queries/useFundingSources';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Edit, Trash2, AlertTriangle, Calendar,
  Percent, FileText, DollarSign
} from 'lucide-react';

export default function FundingSourceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const fundingSourceId = params.id as string;

  const { data: fs, isLoading, error } = useFundingSource(fundingSourceId);
  const deleteMutation = useDeleteFundingSource();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(fundingSourceId);
      router.push('/funding-sources');
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
          <div className="h-48 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !fs) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error?.message || 'Funding source not found'}
        </div>
      </div>
    );
  }

  const utilization = fs.commitment_amount
    ? Math.round((fs.drawn_amount / fs.commitment_amount) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/funding-sources')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Badge className={getTypeColor(fs.type)}>{fs.type}</Badge>
              <h1 className="text-2xl font-semibold text-gray-900">{fs.name}</h1>
              {!fs.is_active && <Badge variant="secondary">Inactive</Badge>}
            </div>
            {fs.lender_name && (
              <p className="text-gray-500">{fs.lender_name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push(`/funding-sources/${fundingSourceId}/edit`)}>
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
                <span className="text-red-800">Delete this funding source?</span>
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

      {/* Portfolio Link */}
      {fs.portfolio && (
        <Card
          className="cursor-pointer hover:border-blue-300 transition-colors"
          onClick={() => router.push(`/portfolios/${fs.portfolio.id}`)}
        >
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Portfolio:</span>
                <span className="font-medium">{fs.portfolio.name}</span>
                <span className="text-gray-400">({fs.portfolio.code})</span>
              </div>
              <span className="text-blue-600 text-sm">View portfolio →</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Financial Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-500">Utilization</span>
              <span className="text-sm font-medium">{utilization}%</span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  utilization > 90 ? 'bg-orange-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, utilization)}%` }}
              />
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Commitment</p>
              <p className="text-2xl font-semibold">{formatCurrency(fs.commitment_amount)}</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Drawn</p>
              <p className="text-2xl font-semibold text-blue-700">{formatCurrency(fs.drawn_amount)}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Remaining</p>
              <p className="text-2xl font-semibold text-green-700">{formatCurrency(fs.remaining || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            {fs.loan_number && (
              <>
                <dt className="text-sm text-gray-500 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Loan Number
                </dt>
                <dd className="text-sm font-medium">{fs.loan_number}</dd>
              </>
            )}

            {fs.interest_rate !== null && fs.interest_rate !== undefined && (
              <>
                <dt className="text-sm text-gray-500 flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Interest Rate
                </dt>
                <dd className="text-sm font-medium">{fs.interest_rate}%</dd>
              </>
            )}

            {fs.maturity_date && (
              <>
                <dt className="text-sm text-gray-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Maturity Date
                </dt>
                <dd className="text-sm font-medium">{formatDate(fs.maturity_date)}</dd>
              </>
            )}
          </dl>

          {fs.notes && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm text-gray-500 mb-2">Notes</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{fs.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => router.push(`/loan-draws/new?funding_source_id=${fs.id}`)}
          disabled={(fs.remaining || 0) <= 0}
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Create Draw Request
        </Button>
        <Button variant="outline" onClick={() => router.push(`/loan-draws?funding_source_id=${fs.id}`)}>
          View Draw History
        </Button>
      </div>
    </div>
  );
}
```

---

## 5.3 Create/Edit Funding Source Pages

### File: `src/app/(dashboard)/funding-sources/new/page.tsx`

```typescript
'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCreateFundingSource } from '@/hooks/queries/useFundingSources';
import { FundingSourceForm } from '@/components/FundingSourceForm';

export default function NewFundingSourcePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPortfolioId = searchParams.get('portfolio_id');

  const createMutation = useCreateFundingSource();

  const handleSubmit = async (data: any) => {
    try {
      const fs = await createMutation.mutateAsync(data);
      router.push(`/funding-sources/${fs.id}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Add Funding Source</h1>
      <FundingSourceForm
        initialData={preselectedPortfolioId ? { portfolio_id: preselectedPortfolioId } : undefined}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}
```

### File: `src/app/(dashboard)/funding-sources/[id]/edit/page.tsx`

```typescript
'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFundingSource, useUpdateFundingSource } from '@/hooks/queries/useFundingSources';
import { FundingSourceForm } from '@/components/FundingSourceForm';

export default function EditFundingSourcePage() {
  const router = useRouter();
  const params = useParams();
  const fundingSourceId = params.id as string;

  const { data: fs, isLoading } = useFundingSource(fundingSourceId);
  const updateMutation = useUpdateFundingSource();

  const handleSubmit = async (data: any) => {
    try {
      await updateMutation.mutateAsync({ id: fundingSourceId, ...data });
      router.push(`/funding-sources/${fundingSourceId}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-96 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Funding Source</h1>
      <FundingSourceForm
        initialData={fs}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/funding-sources/${fundingSourceId}`)}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}
```

---

## 5.4 Funding Source Form Component

### File: `src/components/FundingSourceForm.tsx`

```typescript
'use client';

import React, { useState } from 'react';
import { usePortfolios } from '@/hooks/queries/usePortfolios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface FundingSourceFormProps {
  initialData?: {
    portfolio_id?: string;
    name?: string;
    type?: string;
    lender_name?: string;
    commitment_amount?: number;
    drawn_amount?: number;
    interest_rate?: number;
    maturity_date?: string;
    loan_number?: string;
    notes?: string;
    is_active?: boolean;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function FundingSourceForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting
}: FundingSourceFormProps) {
  const { data: portfolios } = usePortfolios();

  const [portfolioId, setPortfolioId] = useState(initialData?.portfolio_id || '');
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState(initialData?.type || 'loan');
  const [lenderName, setLenderName] = useState(initialData?.lender_name || '');
  const [commitmentAmount, setCommitmentAmount] = useState(
    initialData?.commitment_amount?.toString() || ''
  );
  const [drawnAmount, setDrawnAmount] = useState(
    initialData?.drawn_amount?.toString() || ''
  );
  const [interestRate, setInterestRate] = useState(
    initialData?.interest_rate?.toString() || ''
  );
  const [maturityDate, setMaturityDate] = useState(
    initialData?.maturity_date?.split('T')[0] || ''
  );
  const [loanNumber, setLoanNumber] = useState(initialData?.loan_number || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      portfolio_id: portfolioId,
      name,
      type,
      lender_name: lenderName || undefined,
      commitment_amount: parseFloat(commitmentAmount) || 0,
      drawn_amount: parseFloat(drawnAmount) || 0,
      interest_rate: interestRate ? parseFloat(interestRate) : undefined,
      maturity_date: maturityDate || undefined,
      loan_number: loanNumber || undefined,
      notes: notes || undefined,
      is_active: isActive,
    });
  };

  const isValid = portfolioId && name && type;

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Portfolio Selection */}
          <div className="space-y-2">
            <Label htmlFor="portfolio">Portfolio *</Label>
            <select
              id="portfolio"
              value={portfolioId}
              onChange={(e) => setPortfolioId(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              required
            >
              <option value="">Select portfolio...</option>
              {portfolios?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Arbor Construction Loan"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
                required
              >
                <option value="loan">Loan</option>
                <option value="grant">Grant</option>
                <option value="equity">Equity</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Lender */}
          <div className="space-y-2">
            <Label htmlFor="lender">Lender / Source Name</Label>
            <Input
              id="lender"
              value={lenderName}
              onChange={(e) => setLenderName(e.target.value)}
              placeholder="e.g., Arbor Realty Trust"
            />
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commitment">Commitment Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <Input
                  id="commitment"
                  type="number"
                  value={commitmentAmount}
                  onChange={(e) => setCommitmentAmount(e.target.value)}
                  className="pl-7"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="drawn">Drawn Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <Input
                  id="drawn"
                  type="number"
                  value={drawnAmount}
                  onChange={(e) => setDrawnAmount(e.target.value)}
                  className="pl-7"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Loan Details (conditional on type) */}
          {type === 'loan' && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="loanNumber">Loan Number</Label>
                <Input
                  id="loanNumber"
                  value={loanNumber}
                  onChange={(e) => setLoanNumber(e.target.value)}
                  placeholder="Reference #"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interestRate">Interest Rate (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  max="100"
                  step="0.001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maturityDate">Maturity Date</Label>
                <Input
                  id="maturityDate"
                  type="date"
                  value={maturityDate}
                  onChange={(e) => setMaturityDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details about this funding source"
              rows={3}
            />
          </div>

          {/* Active toggle (edit mode only) */}
          {initialData && (
            <div className="flex items-center gap-2 pt-4 border-t">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="font-normal">
                Funding source is active
              </Label>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !isValid}>
          {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Add Funding Source'}
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
ls -la src/app/\(dashboard\)/funding-sources/
ls -la src/app/\(dashboard\)/funding-sources/\[id\]/
ls -la src/components/FundingSourceForm.tsx
```

Test in browser:
- [ ] /funding-sources shows list grouped by portfolio
- [ ] Portfolio and type filters work
- [ ] /funding-sources/new creates with preselected portfolio from query param
- [ ] /funding-sources/[id] shows detail with utilization bar
- [ ] /funding-sources/[id]/edit updates
- [ ] Delete works (hard delete if no draws, soft delete if has draws)
- [ ] "Create Draw Request" button works
- [ ] Loan-specific fields only show when type=loan

---

## Stop Gate

Do NOT proceed to Phase 6 until:
1. All funding source pages created and working
2. CRUD operations functional
3. Integration with Cash Position page still works
