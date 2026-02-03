'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PortfolioStats } from './components/PortfolioStats';
import { PortfolioBlockingAlert } from './components/PortfolioBlockingAlert';
import { PropertyList } from './components/PropertyList';
import { usePortfolioStats } from '@/hooks/queries/usePortfolio';
import { Loader2 } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import PageContainer from '../components/PageContainer';

function PortfolioContent() {
  const searchParams = useSearchParams();
  const { data: stats, isLoading } = usePortfolioStats();

  const returnToParams = new URLSearchParams(searchParams.toString());
  returnToParams.delete('returnTo');
  const returnTo = `/renovations${returnToParams.toString() ? `?${returnToParams.toString()}` : ''}`;

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

  if (!stats) return null;

  return (
    <AppLayout>
      <PageContainer>
        {/* Header */}
        <div className="mb-3">
          <h1 className="text-xl font-bold text-gray-900">Renovation Portfolio</h1>
          <p className="text-xs text-gray-500 mt-0.5">Portfolio-wide overview of all renovation projects</p>
        </div>

        {/* Stats Cards */}
        <div className="mb-3">
          <PortfolioStats stats={stats} returnTo={returnTo} />
        </div>

        {/* Blocking Alert */}
        <div className="mb-3">
          <PortfolioBlockingAlert
            blockedCount={stats.blocked_locations}
            blockedByReason={stats.blocked_by_reason}
            returnTo={returnTo}
          />
        </div>

        {/* Property List */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Properties</h2>
          <PropertyList />
        </div>
      </PageContainer>
    </AppLayout>
  );
}

export default function PortfolioPage() {
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
      <PortfolioContent />
    </Suspense>
  );
}
