'use client';

import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Filter } from 'lucide-react';
import { usePortfolio } from '@/context/PortfolioContext';
import { Badge } from '@/components/ui/badge';

interface Props {
  showPropertyFilter?: boolean;
  showLocationFilter?: boolean;
  showYearFilter?: boolean;
  className?: string;
}

export const GlobalFilterBar: React.FC<Props> = ({
  showPropertyFilter = true,
  showLocationFilter = false,
  showYearFilter = true,
  className = '',
}) => {
  const {
    selectedPortfolioId,
    setSelectedPortfolioId,
    selectedLocationId,
    setSelectedLocationId,
    selectedYear,
    setSelectedYear,
    clearAllFilters
  } = usePortfolio();

  const [properties, setProperties] = useState<{ id: number; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch properties list
  useEffect(() => {
    if (!showPropertyFilter) return;

    const fetchProperties = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/projects');
        if (response.ok) {
          const data = await response.json();
          setProperties(data.projects || []);
        }
      } catch (error) {
        console.error('Failed to fetch properties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [showPropertyFilter]);

  // Fetch locations when a property is selected
  useEffect(() => {
    if (!showLocationFilter || !selectedPortfolioId) {
      setLocations([]);
      return;
    }

    const fetchLocations = async () => {
      try {
        const response = await fetch(`/api/renovations/locations?property_id=${selectedPortfolioId}`);
        if (response.ok) {
          const data = await response.json();
          setLocations(data.locations || []);
        }
      } catch (error) {
        console.error('Failed to fetch locations:', error);
      }
    };

    fetchLocations();
  }, [showLocationFilter, selectedPortfolioId]);

  // Generate year options (current year ± 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // Count active filters
  const activeFiltersCount =
    (selectedPortfolioId ? 1 : 0) +
    (selectedLocationId ? 1 : 0) +
    (selectedYear ? 1 : 0);

  if (!showPropertyFilter && !showLocationFilter && !showYearFilter) {
    return null;
  }

  return (
    <div className={`bg-card p-4 rounded-lg border border-border shadow-sm ${className}`}>
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span>Filters:</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="h-5 px-2">
              {activeFiltersCount} active
            </Badge>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-2 flex-1 w-full md:w-auto">
          {/* Property Filter */}
          {showPropertyFilter && (
            <Select
              value={selectedPortfolioId || 'all'}
              onValueChange={(val) => setSelectedPortfolioId(val === 'all' ? null : val)}
              disabled={loading}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Location Filter */}
          {showLocationFilter && (
            <Select
              value={selectedLocationId || 'all'}
              onValueChange={(val) => setSelectedLocationId(val === 'all' ? null : val)}
              disabled={!selectedPortfolioId || locations.length === 0}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id.toString()}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Year Filter */}
          {showYearFilter && (
            <Select
              value={selectedYear || 'all'}
              onValueChange={(val) => setSelectedYear(val === 'all' ? null : val)}
            >
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Clear Filters Button */}
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            <X className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
};
