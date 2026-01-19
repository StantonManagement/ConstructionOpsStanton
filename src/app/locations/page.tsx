'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useRenovationLocations } from '@/hooks/queries/useRenovationLocations';
import { useProjects } from '@/hooks/queries/useProjects';
import { usePortfolio } from '@/context/PortfolioContext';
import { LocationFilterBar } from '@/app/renovations/components/LocationFilterBar';
import { RenovationLocationList } from '@/app/renovations/components/RenovationLocationList';
import { LayoutGrid, List, Loader2, MapPin } from 'lucide-react';
import AppLayout from '../components/AppLayout';

function LocationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedPortfolioId } = usePortfolio();

  const returnToParams = new URLSearchParams(searchParams.toString());
  returnToParams.delete('returnTo');
  const returnTo = `/locations${returnToParams.toString() ? `?${returnToParams.toString()}` : ''}`;

  const [filters, setFilters] = useState({
    property_id: searchParams.get('property_id') || undefined,
    status: searchParams.get('status') ? searchParams.get('status')!.split(',') : [],
    type: searchParams.get('type') || 'all',
    blocked: searchParams.get('blocked') || 'any_state',
    pending_verify: searchParams.get('pending_verify') || 'any_state',
    search: searchParams.get('search') || '',
  });

  const [view, setView] = useState<'grid' | 'list'>(() => (searchParams.get('view') === 'list' ? 'list' : 'grid'));
  const [limit, setLimit] = useState(50);

  const { data: projects } = useProjects();
  
  const filteredProjects = selectedPortfolioId
    ? projects?.filter((p: any) => p.portfolio_id === selectedPortfolioId)
    : projects;

  const properties = filteredProjects?.map(p => ({
    id: p.id,
    name: p.name
  })) || [];

  const { data, isLoading, isFetching } = useRenovationLocations({
    ...filters,
    limit,
    offset: 0,
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.property_id) params.set('property_id', filters.property_id);
    if (filters.status.length > 0) params.set('status', filters.status.join(','));
    if (filters.type && filters.type !== 'all') params.set('type', filters.type);
    if (filters.blocked && filters.blocked !== 'any_state') params.set('blocked', filters.blocked);
    if (filters.pending_verify && filters.pending_verify !== 'any_state') params.set('pending_verify', filters.pending_verify);
    if (filters.search) params.set('search', filters.search);
    if (view && view !== 'grid') params.set('view', view);

    router.replace(`/locations?${params.toString()}`, { scroll: false });
  }, [filters, router, view]);

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setLimit(50);
  };

  const displayedTotal = data?.filtered_total ?? data?.total ?? 0;

  const handleLoadMore = () => {
    setLimit(prev => prev + 50);
  };

  const handleLocationClick = (id: string) => {
    router.push(`/locations/${id}?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const hasMore = data ? data.total > limit : false;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-6 h-6 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
        </div>
        <p className="text-gray-500">
          Manage renovation progress, verify tasks, and resolve blockers across all properties.
        </p>
      </div>

      <LocationFilterBar 
        filters={filters} 
        onFilterChange={handleFilterChange}
        properties={properties}
        totalCount={data?.total || 0}
      />

      <div className="min-h-[400px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            {displayedTotal} Locations Found
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setView('grid')}
                className={`px-2 py-1 text-sm flex items-center gap-1 ${view === 'grid' ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <LayoutGrid className="w-4 h-4" />
                Grid
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className={`px-2 py-1 text-sm flex items-center gap-1 border-l border-gray-200 ${view === 'list' ? 'bg-gray-100 text-gray-900' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
                List
              </button>
            </div>
            {isFetching && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          </div>
        </div>

        <RenovationLocationList 
          locations={data?.locations || []}
          isLoading={isLoading}
          onLocationClick={handleLocationClick}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          view={view}
        />
      </div>
    </div>
  );
}

export default function LocationsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!user) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <AppLayout>
      <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
        <LocationsPageContent />
      </Suspense>
    </AppLayout>
  );
}
