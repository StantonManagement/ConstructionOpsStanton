import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { MobileFilterSheet } from './MobileFilterSheet';

interface FilterState {
  property_id?: string;
  status: string[];
  type: string;
  blocked: string;
  pending_verify?: string;
  search: string;
}

interface Props {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  properties?: { id: number | string; name: string }[]; // List of properties for dropdown
  totalCount?: number;
}

export const LocationFilterBar: React.FC<Props> = ({ filters, onFilterChange, properties = [], totalCount = 0 }) => {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const debouncedSearch = useDebounce(localSearch, 300);

  // Sync debounced search to filters
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFilterChange({ ...filters, search: debouncedSearch });
    }
  }, [debouncedSearch, filters, onFilterChange]);

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      property_id: undefined,
      status: [],
      type: 'all',
      blocked: 'any_state', // 'any_state' means don't filter by blocked status (show all)
      pending_verify: 'any_state',
      search: ''
    });
    setLocalSearch('');
  };

  const applyPreset = (preset: 'needs_attention' | 'blocked' | 'ready' | 'complete') => {
    const base = { ...filters };
    switch (preset) {
      case 'needs_attention':
        onFilterChange({ ...base, status: ['on_hold', 'in_progress'], blocked: 'any_state', pending_verify: 'any_state' });
        break;
      case 'blocked':
        onFilterChange({ ...base, blocked: 'any', status: ['on_hold'], pending_verify: 'any_state' }); // 'any' means is blocked
        break;
      case 'ready':
        onFilterChange({ ...base, status: ['in_progress'], blocked: 'none', pending_verify: 'any' });
        break;
      case 'complete':
        onFilterChange({ ...base, status: ['complete'], blocked: 'any_state', pending_verify: 'any_state' });
        break;
    }
  };

  return (
    <div className="space-y-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      {/* Mobile View */}
      <div className="md:hidden space-y-3">
        <div className="flex gap-2 items-center">
          <Select 
            value={filters.property_id?.toString() || "all"} 
            onValueChange={(val) => updateFilter('property_id', val === "all" ? undefined : val)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <MobileFilterSheet 
            filters={filters} 
            onFilterChange={onFilterChange} 
            count={totalCount} 
          />

          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsSearchOpen((v) => !v)}
            aria-label={isSearchOpen ? 'Close search' : 'Open search'}
          >
            {isSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {isSearchOpen && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search locations..." 
              className="pl-9"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Desktop View - Top Row */}
      <div className="hidden md:flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search locations..." 
            className="pl-9"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-[2]">
          {/* Property Filter */}
          <Select 
            value={filters.property_id?.toString() || "all"} 
            onValueChange={(val) => updateFilter('property_id', val === "all" ? undefined : val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select 
            value={filters.status.length === 0 ? "all" : filters.status.length > 1 ? "multiple" : filters.status[0]} 
            onValueChange={(val) => updateFilter('status', val === "all" ? [] : [val])}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="on_hold">Blocked / On Hold</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select 
            value={filters.type || "all"} 
            onValueChange={(val) => updateFilter('type', val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="unit">Units</SelectItem>
              <SelectItem value="common_area">Common Areas</SelectItem>
              <SelectItem value="exterior">Exterior</SelectItem>
              <SelectItem value="building_system">Building System</SelectItem>
            </SelectContent>
          </Select>

          {/* Blocked Filter */}
          <Select 
            value={filters.blocked || "any_state"} 
            onValueChange={(val) => updateFilter('blocked', val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Blocking Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any_state">Any Status</SelectItem>
              <SelectItem value="none">Not Blocked</SelectItem>
              <SelectItem value="any">Blocked (Any Reason)</SelectItem>
              <SelectItem value="materials">Materials</SelectItem>
              <SelectItem value="labor">Labor</SelectItem>
              <SelectItem value="cash">Cash Flow</SelectItem>
              <SelectItem value="dependency">Dependency</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bottom Row: Presets & Clear (Visible on both but hidden in mobile usually if we move presets to sheet) */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100">
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          <Button variant="outline" size="sm" onClick={() => applyPreset('needs_attention')} className="whitespace-nowrap">
            Needs Attention
          </Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset('blocked')} className="whitespace-nowrap text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100">
            Blocked
          </Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset('ready')} className="whitespace-nowrap text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100">
            Ready to Verify
          </Button>
          <Button variant="outline" size="sm" onClick={() => applyPreset('complete')} className="whitespace-nowrap text-green-700 border-green-200 bg-green-50 hover:bg-green-100">
            Completed
          </Button>
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearFilters}
          className="text-gray-500 hover:text-gray-900"
        >
          <X className="w-4 h-4 mr-2" />
          Clear Filters
        </Button>
      </div>
    </div>
  );
};
