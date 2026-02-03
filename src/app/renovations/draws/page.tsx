'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRenovationDraws, useDrawEligibility } from '@/hooks/queries/useDraws';
import { usePortfolioProperties } from '@/hooks/queries/usePortfolio';
import { DrawStatsCards } from './components/DrawStatsCards';
import { DrawCard } from './components/DrawCard';
import { Loader2, Plus } from 'lucide-react';
import AppLayout from '@/app/components/AppLayout';
import PageContainer from '@/app/components/PageContainer';

function DrawsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnToParams = new URLSearchParams(searchParams.toString());
  returnToParams.delete('returnTo');
  const returnTo = `/renovations/draws${returnToParams.toString() ? `?${returnToParams.toString()}` : ''}`;

  const propertyId = searchParams.get('property_id') || 'all';
  const status = searchParams.get('status') || 'all';

  const { data: eligibility, isLoading: isLoadingStats } = useDrawEligibility();
  const { data: drawsData, isLoading: isLoadingDraws } = useRenovationDraws({
    property_id: propertyId === 'all' ? undefined : propertyId,
    status: status === 'all' ? undefined : status
  });
  const { data: portfolio } = usePortfolioProperties();

  const handleCreateDraw = () => {
    if (propertyId && propertyId !== 'all') {
      router.push(`/renovations/draws/new?property_id=${propertyId}&returnTo=${encodeURIComponent(returnTo)}`);
    } else {
      router.push(`/renovations/draws/new?returnTo=${encodeURIComponent(returnTo)}`);
    }
  };

  const handleFilterChange = (key: 'property_id' | 'status', value: string) => {
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete('returnTo');
    if (value === 'all') params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.replace(qs ? `/renovations/draws?${qs}` : '/renovations/draws', { scroll: false });
  };

  return (
    <AppLayout>
      <PageContainer>
        {/* Header */}
        <div className="mb-3">
          <h1 className="text-xl font-bold text-foreground">Draws Management</h1>
          <p className="text-xs text-muted-foreground">Track and manage construction loan draws</p>
        </div>

        {/* Stats */}
        <DrawStatsCards data={eligibility} isLoading={isLoadingStats} />

        <div className="border-t border-border my-3"></div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={propertyId}
              onChange={(e) => handleFilterChange('property_id', e.target.value)}
              className="w-[200px] px-2 py-1.5 text-xs border border-border rounded bg-background text-foreground focus:ring-1 focus:ring-ring focus:border-ring"
            >
              <option value="all">All Properties</option>
              {portfolio?.properties.map(p => (
                <option key={p.project_id} value={p.project_id.toString()}>
                  {p.project_name}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-[150px] px-2 py-1.5 text-xs border border-border rounded bg-background text-foreground focus:ring-1 focus:ring-ring focus:border-ring"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="funded">Funded</option>
            </select>
          </div>

          <button
            onClick={handleCreateDraw}
            className="w-full sm:w-auto px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3" />
            New Draw Request
          </button>
        </div>

        {/* List */}
        <div className="space-y-3">
          {isLoadingDraws ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : drawsData?.draws?.length === 0 ? (
            <div className="text-center py-12 bg-muted rounded-lg border border-dashed border-border">
              <p className="text-xs text-muted-foreground mb-2">No draws found</p>
              <button
                onClick={handleCreateDraw}
                className="px-3 py-1.5 text-xs border border-border rounded hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Create First Draw
              </button>
            </div>
          ) : (
            drawsData?.draws?.map(draw => (
              <DrawCard key={draw.id} draw={draw} returnTo={returnTo} />
            ))
          )}
        </div>
      </PageContainer>
    </AppLayout>
  );
}

export default function DrawsPage() {
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
      <DrawsPageContent />
    </Suspense>
  );
}
