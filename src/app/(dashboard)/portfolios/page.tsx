'use client';

import React, { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { usePortfolios } from '@/hooks/queries/usePortfolios';
import { Plus, Building2, DollarSign, FolderOpen, ChevronRight, Loader2 } from 'lucide-react';
import AppLayout from '@/app/components/AppLayout';
import PageContainer from '@/app/components/PageContainer';

function PortfoliosContent() {
  const router = useRouter();
  const [showInactive, setShowInactive] = useState(false);
  const { data: portfolios, isLoading, error } = usePortfolios({ activeOnly: !showInactive });

  if (isLoading) {
    return (
      <AppLayout>
        <PageContainer>
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-muted rounded w-32" />
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-muted rounded-lg" />
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
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive text-sm">
            Error loading portfolios: {error.message}
          </div>
        </PageContainer>
      </AppLayout>
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
    <AppLayout>
      <PageContainer>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Portfolios</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage property portfolios and funding sources</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-border w-3 h-3"
            />
            Show inactive
          </label>
          <button
            onClick={() => router.push('/portfolios/new')}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3 h-3" />
            New
          </button>
        </div>
      </div>

      {/* Portfolio Cards */}
      {portfolios?.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">No portfolios yet</h3>
          <p className="text-xs text-muted-foreground mb-3">Create your first portfolio to organize projects and funding.</p>
          <button
            onClick={() => router.push('/portfolios/new')}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90 transition-colors"
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
              className="bg-card rounded-lg border border-border p-3 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
              onClick={() => router.push(`/portfolios/${portfolio.id}`)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-card-foreground truncate" title={portfolio.name}>
                    {portfolio.name}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate" title={portfolio.code}>
                    {portfolio.code}
                  </p>
                </div>
                {!portfolio.is_active && (
                  <span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded ml-2 shrink-0">
                    Inactive
                  </span>
                )}
              </div>

              {/* Description */}
              {portfolio.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {portfolio.description}
                </p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-2 pt-2 border-t border-border">
                <div className="text-center p-1.5 bg-primary/10 rounded">
                  <p className="text-sm font-bold text-card-foreground">{portfolio.totals?.projects || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Projects</p>
                </div>
                <div className="text-center p-1.5 bg-accent/10 rounded">
                  <p className="text-sm font-bold text-card-foreground">{portfolio.totals?.funding_sources || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Sources</p>
                </div>
              </div>

              {/* Funding Summary */}
              {(portfolio.totals?.commitment || 0) > 0 && (
                <div className="pt-2 border-t border-border">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Committed</span>
                    <span className="font-semibold text-card-foreground">
                      {formatCurrency(portfolio.totals?.commitment || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Drawn</span>
                    <span className="font-semibold text-card-foreground">
                      {formatCurrency(portfolio.totals?.drawn || 0)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-1.5 bg-primary rounded-full transition-all"
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
    </AppLayout>
  );
}

export default function PortfoliosPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <PageContainer>
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </PageContainer>
      </AppLayout>
    }>
      <PortfoliosContent />
    </Suspense>
  );
}
