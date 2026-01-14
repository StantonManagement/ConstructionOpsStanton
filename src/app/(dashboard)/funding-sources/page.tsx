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
