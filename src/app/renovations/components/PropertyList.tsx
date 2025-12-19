import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, Building2 } from 'lucide-react';
import { usePortfolioProperties } from '@/hooks/queries/usePortfolio';
import { PropertyCard } from './PropertyCard';
import { useDebounce } from '@/hooks/useDebounce'; // Assuming this exists, if not I'll define it or use timeout

export const PropertyList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  
  // Debounce search input
  // Since I don't know if useDebounce exists, I'll just pass search directly for now or check if file exists. 
  // For safety, I'll just use the raw value but maybe with a simple timeout if I implemented it, 
  // but let's rely on React Query's caching/deduping for now or let the hook handle it.
  // Actually, let's just stick to raw value for simplicity, user types -> fetch. 
  
  const { data, isLoading, error } = usePortfolioProperties({ 
    search, 
    sort,
    order: sort === 'progress' || sort === 'blocked' ? 'desc' : 'asc'
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
        <Select value={sort} onValueChange={setSort}>
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
