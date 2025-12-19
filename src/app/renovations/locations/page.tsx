'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LocationFilterBar } from '../components/LocationFilterBar';
import { RenovationLocationList } from '../components/RenovationLocationList';
import { useRenovationLocations } from '@/hooks/queries/useRenovationLocations';
import { usePortfolioProperties } from '@/hooks/queries/usePortfolio';
import { Loader2, MapPin } from 'lucide-react';

function LocationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize filters from URL
  const [filters, setFilters] = useState({
    property_id: searchParams.get('property_id') || undefined,
    status: searchParams.get('status') ? searchParams.get('status')!.split(',') : [],
    type: searchParams.get('type') || 'all',
    blocked: searchParams.get('blocked') || 'any_state',
    search: searchParams.get('search') || '',
  });

  // Fetch properties for filter dropdown
  const { data: portfolioData } = usePortfolioProperties();
  const properties = portfolioData?.properties.map(p => ({
    id: p.project_id,
    name: p.project_name
  })) || [];

  // Pagination state
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Fetch locations
  const { data, isLoading, isFetching } = useRenovationLocations({
    ...filters,
    limit,
    offset: 0 // Always fetch from 0 to limit for now to support "Load More" by increasing limit? 
              // Or better: Append data? React Query replaces data by default.
              // For "Load More" pattern with React Query, usually we use useInfiniteQuery.
              // But to keep it simple as per plan ("Start with Load More..."), 
              // we can just increase the limit or use the offset to fetch next page and append manually.
              // However, useRenovationLocations returns a single page. 
              // Let's implement simple limit increase for "Load More" behavior for now, 
              // as it's easier than manual appending with standard useQuery.
              // If performance becomes an issue, we switch to infinite query.
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.property_id) params.set('property_id', filters.property_id);
    if (filters.status.length > 0) params.set('status', filters.status.join(','));
    if (filters.type && filters.type !== 'all') params.set('type', filters.type);
    if (filters.blocked && filters.blocked !== 'any_state') params.set('blocked', filters.blocked);
    if (filters.search) params.set('search', filters.search);

    router.replace(`/renovations/locations?${params.toString()}`, { scroll: false });
  }, [filters, router]);

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setLimit(50); // Reset pagination on filter change
    setOffset(0);
  };

  const handleLoadMore = () => {
    setLimit(prev => prev + 50);
  };

  const handleLocationClick = (id: string) => {
    // Navigate to detail page (to be implemented)
    // Using a placeholder route or maybe the existing punch list route?
    // Plan says: "Navigate to /renovations/locations/{id}"
    // But currently that route doesn't exist.
    // However, existing app might have /projects/{pid}/locations/{lid}?
    // Let's stick to the plan: /renovations/locations/[id]
    // Wait, I need to create that route later? 
    // Or I can redirect to the punch list modal or page.
    // For now, let's assume /renovations/locations/[id] will be created or used.
    // Actually, UI_3 says "Navigate to /renovations/locations/{id} ... This is the punch list / task detail page"
    // I haven't implemented [id]/page.tsx yet.
    // I'll add a todo for it.
    console.log('Navigate to location', id);
    // Temporary alert until detail page is ready
    // alert(`Navigate to location ${id}`);
  };

  const hasMore = data ? data.total > limit : false;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-6 h-6 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
        </div>
        <p className="text-gray-500">
          Manage renovation progress, verify tasks, and resolve blockers across all properties.
        </p>
      </div>

      {/* Filter Bar */}
      <LocationFilterBar 
        filters={filters} 
        onFilterChange={handleFilterChange}
        properties={properties}
        totalCount={data?.total || 0}
      />

      {/* Results */}
      <div className="min-h-[400px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            {data?.total || 0} Locations Found
          </h2>
          {isFetching && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>

        <RenovationLocationList 
          locations={data?.locations || []}
          isLoading={isLoading}
          onLocationClick={handleLocationClick}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
        />
      </div>
    </div>
  );
}

export default function LocationsPage() {
  return (
    <Suspense fallback={<div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <LocationsPageContent />
    </Suspense>
  );
}
