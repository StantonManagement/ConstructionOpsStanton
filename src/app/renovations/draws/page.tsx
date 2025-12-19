'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRenovationDraws, useDrawEligibility } from '@/hooks/queries/useDraws';
import { usePortfolioProperties } from '@/hooks/queries/usePortfolio';
import { DrawStatsCards } from './components/DrawStatsCards';
import { DrawCard } from './components/DrawCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';

function DrawsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnTo = `/renovations/draws${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

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
    if (value === 'all') params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.replace(qs ? `/renovations/draws?${qs}` : '/renovations/draws', { scroll: false });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Draws Management</h1>
        <p className="text-gray-500">Track and manage construction loan draws</p>
      </div>

      {/* Stats */}
      <DrawStatsCards data={eligibility} isLoading={isLoadingStats} />

      <div className="border-t border-gray-200 my-6"></div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={propertyId} onValueChange={(val) => handleFilterChange('property_id', val)}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {portfolio?.properties.map(p => (
                <SelectItem key={p.project_id} value={p.project_id.toString()}>
                  {p.project_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(val) => handleFilterChange('status', val)}>
            <SelectTrigger className="w-[150px] bg-white">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="funded">Funded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleCreateDraw} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          New Draw Request
        </Button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {isLoadingDraws ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : drawsData?.draws?.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500 mb-2">No draws found</p>
            <Button variant="outline" onClick={handleCreateDraw}>
              Create First Draw
            </Button>
          </div>
        ) : (
          drawsData?.draws?.map(draw => (
            <DrawCard key={draw.id} draw={draw} returnTo={returnTo} />
          ))
        )}
      </div>
    </div>
  );
}

export default function DrawsPage() {
  return (
    <Suspense fallback={<div className="p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <DrawsPageContent />
    </Suspense>
  );
}
