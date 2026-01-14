'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCashPosition } from '@/hooks/queries/useCashPosition';
import FundingSourceCard from '@/components/FundingSourceCard';

export default function CashPositionPage() {
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
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error loading cash position</h3>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  const portfolios = data?.portfolios || [];

  if (portfolios.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Cash Position</h1>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No portfolios or funding sources found.</p>
          <p className="text-sm text-gray-500 mt-2">
            Add funding sources to track your cash position.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cash Position</h1>
        <button
          onClick={() => router.push('/funding-sources/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
        >
          + Add Funder
        </button>
      </div>

      <div className="space-y-8">
        {portfolios.map((portfolio) => (
          <div key={portfolio.id} className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 uppercase">
              {portfolio.name}
            </h2>

            {portfolio.funding_sources.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center text-gray-500">
                No funding sources for this portfolio
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {portfolio.funding_sources.map((fundingSource) => (
                    <FundingSourceCard
                      key={fundingSource.id}
                      fundingSource={fundingSource}
                      onCreateDraw={handleCreateDraw}
                    />
                  ))}
                </div>

                <div className="bg-white border-t-2 border-gray-300 rounded-lg p-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Portfolio Total:</span>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(portfolio.totals.remaining)} remaining
                      </div>
                      <div className="text-sm text-gray-600">
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
    </div>
  );
}
