'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePortfolios } from '@/hooks/queries/usePortfolios';
import { Plus, Building2, DollarSign, FolderOpen, ChevronRight } from 'lucide-react';
import PageContainer from '@/app/components/PageContainer';

export default function PortfoliosPage() {
  const router = useRouter();
  const [showInactive, setShowInactive] = useState(false);
  const { data: portfolios, isLoading, error } = usePortfolios({ activeOnly: !showInactive });

  if (isLoading) {
    return (
      <PageContainer>
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-32" />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          Error loading portfolios: {error.message}
        </div>
      </PageContainer>
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
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Portfolios</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage property portfolios and funding sources</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 w-3 h-3"
            />
            Show inactive
          </label>
          <button
            onClick={() => router.push('/portfolios/new')}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs rounded hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3 h-3" />
            New
          </button>
        </div>
      </div>

      {/* Portfolio Cards */}
      {portfolios?.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <FolderOpen className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No portfolios yet</h3>
          <p className="text-xs text-gray-500 mb-3">Create your first portfolio to organize projects and funding.</p>
          <button
            onClick={() => router.push('/portfolios/new')}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs rounded hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Create Portfolio
          </button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {portfolios?.map((portfolio) => (
            <div
              key={portfolio.id}
              className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
              onClick={() => router.push(`/portfolios/${portfolio.id}`)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-gray-900 truncate" title={portfolio.name}>
                    {portfolio.name}
                  </h3>
                  <p className="text-xs text-gray-500 truncate" title={portfolio.code}>
                    {portfolio.code}
                  </p>
                </div>
                {!portfolio.is_active && (
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded ml-2 shrink-0">
                    Inactive
                  </span>
                )}
              </div>

              {/* Description */}
              {portfolio.description && (
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                  {portfolio.description}
                </p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-2 pt-2 border-t border-gray-100">
                <div className="text-center p-1.5 bg-blue-50 rounded">
                  <p className="text-sm font-bold text-gray-900">{portfolio.totals?.projects || 0}</p>
                  <p className="text-[10px] text-gray-500">Projects</p>
                </div>
                <div className="text-center p-1.5 bg-green-50 rounded">
                  <p className="text-sm font-bold text-gray-900">{portfolio.totals?.funding_sources || 0}</p>
                  <p className="text-[10px] text-gray-500">Sources</p>
                </div>
              </div>

              {/* Funding Summary */}
              {(portfolio.totals?.commitment || 0) > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Committed</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(portfolio.totals?.commitment || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-500">Drawn</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(portfolio.totals?.drawn || 0)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-1.5 bg-blue-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, ((portfolio.totals?.drawn || 0) / (portfolio.totals?.commitment || 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
