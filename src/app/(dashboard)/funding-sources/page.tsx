'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFundingSources } from '@/hooks/queries/useFundingSources';
import { usePortfolios } from '@/hooks/queries/usePortfolios';
import { Plus, DollarSign, ChevronRight, Filter } from 'lucide-react';
import AppLayout from '@/app/components/AppLayout';
import PageContainer from '@/app/components/PageContainer';

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
      <AppLayout>
        <PageContainer>
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-gray-200 rounded w-40" />
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded-lg" />
              ))}
            </div>
          </div>
        </PageContainer>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <PageContainer>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            Error loading funding sources: {error.message}
          </div>
        </PageContainer>
      </AppLayout>
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
    <AppLayout>
      <PageContainer>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Funding Sources</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage loans, grants, and equity across portfolios</p>
          </div>
          <button
            onClick={() => router.push('/funding-sources/new')}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs rounded hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3 h-3" />
            New
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500">Filter:</span>
            </div>

            <select
              value={portfolioFilter}
              onChange={(e) => setPortfolioFilter(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs"
            >
              <option value="">All Portfolios</option>
              {portfolios?.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs"
            >
              <option value="">All Types</option>
              <option value="loan">Loan</option>
              <option value="grant">Grant</option>
              <option value="equity">Equity</option>
              <option value="other">Other</option>
            </select>

            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-gray-300 w-3 h-3"
              />
              Show inactive
            </label>
          </div>
        </div>

        {/* Funding Sources List */}
        {fundingSources?.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <DollarSign className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <h3 className="text-sm font-semibold text-gray-900 mb-1">No funding sources</h3>
            <p className="text-xs text-gray-500 mb-3">Add your first loan, grant, or equity source.</p>
            <button
              onClick={() => router.push('/funding-sources/new')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs rounded hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Funding Source
            </button>
          </div>
        ) : portfolioFilter ? (
          // Flat list when filtered
          <div className="space-y-2">
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
          <div className="space-y-4">
            {Object.entries(grouped || {}).map(([key, group]: [string, any]) => (
              <div key={key}>
                <h3 className="text-sm font-bold text-gray-900 mb-2">
                  {group.portfolio?.name || 'Unassigned'}
                  {group.portfolio?.code && (
                    <span className="text-xs font-normal text-gray-500 ml-2">
                      ({group.portfolio.code})
                    </span>
                  )}
                </h3>
                <div className="space-y-2">
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
      </PageContainer>
    </AppLayout>
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
    <div
      className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${getTypeColor(fs.type)}`}>
            {fs.type}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-gray-900 truncate">{fs.name}</p>
              {!fs.is_active && (
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded shrink-0">
                  Inactive
                </span>
              )}
            </div>
            {fs.lender_name && (
              <p className="text-xs text-gray-500 truncate">{fs.lender_name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-gray-500">Commitment</p>
            <p className="text-xs font-semibold text-gray-900">{formatCurrency(fs.commitment_amount)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500">Drawn</p>
            <p className="text-xs font-semibold text-gray-900">{formatCurrency(fs.drawn_amount)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500">Remaining</p>
            <p className="text-xs font-semibold text-gray-900">{formatCurrency(fs.remaining || 0)}</p>
          </div>
          <div className="w-20">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-gray-500">Used</span>
              <span className="font-semibold">{utilization}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  utilization > 90 ? 'bg-orange-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, utilization)}%` }}
              />
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  );
}
