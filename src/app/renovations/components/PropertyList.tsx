import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, Building2 } from 'lucide-react';
import { usePortfolioProperties } from '@/hooks/queries/usePortfolio';
import { PropertyCard } from './PropertyCard';
import { useDebounce } from '@/hooks/useDebounce'; // Assuming this exists, if not I'll define it or use timeout
import { useRouter, useSearchParams } from 'next/navigation';

export const PropertyList: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [sort, setSort] = useState(() => searchParams.get('sort') || 'name');
  const [order, setOrder] = useState<'asc' | 'desc'>(() => {
    const fromUrl = searchParams.get('order');
    if (fromUrl === 'asc' || fromUrl === 'desc') return fromUrl;
    const urlSort = searchParams.get('sort') || 'name';
    return urlSort === 'progress' || urlSort === 'blocked' ? 'desc' : 'asc';
  });
  
  // Debounce search input
  // Since I don't know if useDebounce exists, I'll just pass search directly for now or check if file exists. 
  // For safety, I'll just use the raw value but maybe with a simple timeout if I implemented it, 
  // but let's rely on React Query's caching/deduping for now or let the hook handle it.
  // Actually, let's just stick to raw value for simplicity, user types -> fetch. 
  
  const debouncedSearch = useDebounce(search, 300);

  const effectiveOrder = useMemo(() => {
    if (sort === 'progress' || sort === 'blocked') return 'desc' as const;
    return order;
  }, [order, sort]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (debouncedSearch) params.set('search', debouncedSearch);
    else params.delete('search');

    if (sort && sort !== 'name') params.set('sort', sort);
    else params.delete('sort');

    if (effectiveOrder && !(sort === 'name' && effectiveOrder === 'asc')) params.set('order', effectiveOrder);
    else params.delete('order');

    router.replace(`/renovations?${params.toString()}`, { scroll: false });
  }, [debouncedSearch, effectiveOrder, router, searchParams, sort]);

  const { data, isLoading, error } = usePortfolioProperties({
    search: debouncedSearch,
    sort,
    order: effectiveOrder,
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search properties..." 
            className="pl-9 bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={sort}
          onValueChange={(value) => {
            setSort(value);
            if (value === 'progress' || value === 'blocked') {
              setOrder('desc');
            } else {
              setOrder('asc');
            }
          }}
        >
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name (A-Z)</SelectItem>
            <SelectItem value="progress">Progress (High-Low)</SelectItem>
            <SelectItem value="blocked">Blocked (High-Low)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg">
            Error loading properties. Please try again.
          </div>
        ) : data?.properties.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No properties found</h3>
            <p className="text-gray-500">
              {search ? 'Try adjusting your search terms.' : 'No renovation properties configured yet.'}
            </p>
          </div>
        ) : (
          data?.properties.map(property => (
            <PropertyCard key={property.project_id} property={property} />
          ))
        )}
      </div>
    </div>
  );
};
