'use client';

import React, { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useCashPosition } from '@/hooks/queries/useCashPosition';
import { useFundingSources } from '@/hooks/queries/useFundingSources';
import { usePortfolios } from '@/hooks/queries/usePortfolios';
import FundingSourceCard from '@/components/FundingSourceCard';
import AppLayout from '@/app/components/AppLayout';
import PageContainer from '@/app/components/PageContainer';
import { Plus, Loader2, DollarSign, Filter, ChevronRight } from 'lucide-react';

function CashPositionContent() {
  const router = useRouter();
  const { data, isLoading, error } = useCashPosition();
  const [portfolioFilter, setPortfolioFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);

  const { data: portfolios } = usePortfolios();
  const { data: allFundingSources, isLoading: fundingSourcesLoading } = useFundingSources({
    portfolioId: portfolioFilter || undefined,
    type: typeFilter as any || undefined,
    activeOnly: !showInactive,
  });

  const handleCreateDraw = (fundingSourceId: string) => {
    router.push(`/loan-draws/new?funding_source_id=${fundingSourceId}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'loan': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'grant': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'equity': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-muted text-muted-foreground';
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
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </PageContainer>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <PageContainer>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm">
            Error loading cash position: {error.message}
          </div>
        </PageContainer>
      </AppLayout>
    );
  }

  const portfoliosWithFunding = data?.portfolios || [];

  return (
    <AppLayout>
      <PageContainer>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Cash Position</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Track available funding across portfolios</p>
          </div>
          <button
            onClick={() => router.push('/funding-sources/new')}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs rounded hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Funder
          </button>
        </div>

        {/* Portfolio Cash Position - Only show if there are portfolios with funding */}
        {portfoliosWithFunding.length > 0 && (
          <div className="space-y-4 mb-8">
            <h2 className="text-sm font-semibold text-foreground">Cash Position by Portfolio</h2>
            {portfoliosWithFunding.map((portfolio) => (
              <div key={portfolio.id} className="bg-muted rounded-lg p-3">
                <h3 className="text-sm font-semibold text-foreground mb-3 uppercase">
                  {portfolio.name}
                </h3>

                {portfolio.funding_sources.length === 0 ? (
                  <div className="bg-card border border-border rounded-lg p-3 text-center text-xs text-muted-foreground">
                    No funding sources for this portfolio
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 mb-3">
                      {portfolio.funding_sources.map((fundingSource) => (
                        <FundingSourceCard
                          key={fundingSource.id}
                          fundingSource={fundingSource}
                          onCreateDraw={handleCreateDraw}
                        />
                      ))}
                    </div>

                    <div className="bg-card border-t-2 border-border rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-xs text-foreground">Portfolio Total:</span>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-foreground">
                            {formatCurrency(portfolio.totals.remaining)} remaining
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(portfolio.totals.eligible)} eligible to draw
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* All Funding Sources Section */}
        <div className="border-t border-border pt-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">All Funding Sources</h2>

          {/* Filters */}
          <div className="bg-card border border-border rounded-lg p-3 mb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Filter:</span>
              </div>

              <select
                value={portfolioFilter}
                onChange={(e) => setPortfolioFilter(e.target.value)}
                className="border border-border rounded px-2 py-1 text-xs bg-background text-foreground"
              >
                <option value="">All Portfolios</option>
                {portfolios?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border border-border rounded px-2 py-1 text-xs bg-background text-foreground"
              >
                <option value="">All Types</option>
                <option value="loan">Loan</option>
                <option value="grant">Grant</option>
                <option value="equity">Equity</option>
                <option value="other">Other</option>
              </select>

              <label className="flex items-center gap-1.5 text-xs text-foreground">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-border w-3 h-3"
                />
                Show inactive
              </label>
            </div>
          </div>

          {/* Funding Sources List */}
          {fundingSourcesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !allFundingSources || allFundingSources.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <DollarSign className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">No funding sources</h3>
              <p className="text-xs text-muted-foreground mb-3">Add your first loan, grant, or equity source.</p>
              <button
                onClick={() => router.push('/funding-sources/new')}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs rounded hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Funding Source
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {allFundingSources.map((fs: any) => (
                <div
                  key={fs.id}
                  className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
                  onClick={() => router.push(`/funding-sources/${fs.id}`)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${getTypeColor(fs.type)}`}>
                        {fs.type}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-foreground truncate">{fs.name}</p>
                          {!fs.is_active && (
                            <span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded shrink-0">
                              Inactive
                            </span>
                          )}
                        </div>
                        {fs.lender_name && (
                          <p className="text-xs text-muted-foreground truncate">{fs.lender_name}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">Commitment</p>
                        <p className="text-xs font-semibold text-foreground">{formatCurrency(fs.commitment_amount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">Drawn</p>
                        <p className="text-xs font-semibold text-foreground">{formatCurrency(fs.drawn_amount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">Remaining</p>
                        <p className="text-xs font-semibold text-foreground">{formatCurrency(fs.remaining || 0)}</p>
                      </div>
                      <div className="w-20">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground">Used</span>
                          <span className="font-semibold text-foreground">{getUtilization(fs)}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              getUtilization(fs) > 90 ? 'bg-orange-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(100, getUtilization(fs))}%` }}
                          />
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </AppLayout>
  );
}

export default function CashPositionPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <PageContainer>
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </PageContainer>
      </AppLayout>
    }>
      <CashPositionContent />
    </Suspense>
  );
}
