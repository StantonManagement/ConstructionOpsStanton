'use client';

import React, { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useCashPosition } from '@/hooks/queries/useCashPosition';
import FundingSourceCard from '@/components/FundingSourceCard';
import AppLayout from '@/app/components/AppLayout';
import PageContainer from '@/app/components/PageContainer';
import { Plus, Loader2, DollarSign } from 'lucide-react';

function CashPositionContent() {
  const router = useRouter();
  const { data, isLoading, error } = useCashPosition();
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <AppLayout>
        <PageContainer>
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
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
            Error loading cash position: {error.message}
          </div>
        </PageContainer>
      </AppLayout>
    );
  }

  const portfolios = data?.portfolios || [];

  if (portfolios.length === 0) {
    return (
      <AppLayout>
        <PageContainer>
          <div className="mb-3">
            <h1 className="text-xl font-bold text-gray-900">Cash Position</h1>
            <p className="text-xs text-gray-500 mt-0.5">Track available funding across portfolios</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <DollarSign className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <h3 className="text-sm font-semibold text-gray-900 mb-1">No portfolios or funding sources found</h3>
            <p className="text-xs text-gray-500 mb-3">
              Add funding sources to track your cash position.
            </p>
            <button
              onClick={() => router.push('/funding-sources/new')}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs rounded hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Funding Source
            </button>
          </div>
        </PageContainer>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageContainer>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Cash Position</h1>
            <p className="text-xs text-gray-500 mt-0.5">Track available funding across portfolios</p>
          </div>
          <button
            onClick={() => router.push('/funding-sources/new')}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs rounded hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Funder
          </button>
        </div>

        {/* Portfolios */}
        <div className="space-y-4">
          {portfolios.map((portfolio) => (
            <div key={portfolio.id} className="bg-gray-50 rounded-lg p-3">
              <h2 className="text-sm font-semibold text-gray-900 mb-3 uppercase">
                {portfolio.name}
              </h2>

              {portfolio.funding_sources.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-center text-xs text-gray-500">
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

                  <div className="bg-white border-t-2 border-gray-300 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-xs text-gray-700">Portfolio Total:</span>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(portfolio.totals.remaining)} remaining
                        </div>
                        <div className="text-xs text-gray-600">
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
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </PageContainer>
      </AppLayout>
    }>
      <CashPositionContent />
    </Suspense>
  );
}
