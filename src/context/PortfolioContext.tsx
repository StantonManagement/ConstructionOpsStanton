'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface PortfolioContextType {
  // Property/Portfolio filter
  selectedPortfolioId: string | null;
  setSelectedPortfolioId: (id: string | null) => void;
  portfolioCode: string | null;

  // Location filter (for specific locations within a property)
  selectedLocationId: string | null;
  setSelectedLocationId: (id: string | null) => void;

  // Year filter (for fiscal year filtering)
  selectedYear: string | null;
  setSelectedYear: (year: string | null) => void;

  // Convenience methods
  clearPortfolioFilter: () => void;
  clearAllFilters: () => void;

  // Get all active filters as object
  getActiveFilters: () => {
    portfolio_id?: string;
    location_id?: string;
    year?: string;
  };
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse URL params
  const portfolioParam = searchParams.get('portfolio');
  const locationParam = searchParams.get('location');
  const yearParam = searchParams.get('year');

  const selectedPortfolioId = useMemo(() => {
    return portfolioParam && portfolioParam !== 'all' ? portfolioParam : null;
  }, [portfolioParam]);

  const selectedLocationId = useMemo(() => {
    return locationParam && locationParam !== 'all' ? locationParam : null;
  }, [locationParam]);

  const selectedYear = useMemo(() => {
    return yearParam && yearParam !== 'all' ? yearParam : null;
  }, [yearParam]);

  // Update URL with new params
  const updateParams = React.useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(newUrl, { scroll: false });
  }, [searchParams, pathname, router]);

  const setSelectedPortfolioId = React.useCallback((id: string | null) => {
    updateParams({ portfolio: id });
  }, [updateParams]);

  const setSelectedLocationId = React.useCallback((id: string | null) => {
    updateParams({ location: id });
  }, [updateParams]);

  const setSelectedYear = React.useCallback((year: string | null) => {
    updateParams({ year });
  }, [updateParams]);

  const clearPortfolioFilter = React.useCallback(() => {
    updateParams({ portfolio: null });
  }, [updateParams]);

  const clearAllFilters = React.useCallback(() => {
    updateParams({ portfolio: null, location: null, year: null });
  }, [updateParams]);

  const getActiveFilters = React.useCallback(() => {
    const filters: { portfolio_id?: string; location_id?: string; year?: string } = {};
    if (selectedPortfolioId) filters.portfolio_id = selectedPortfolioId;
    if (selectedLocationId) filters.location_id = selectedLocationId;
    if (selectedYear) filters.year = selectedYear;
    return filters;
  }, [selectedPortfolioId, selectedLocationId, selectedYear]);

  const portfolioCode = portfolioParam || null;

  const value = useMemo(
    () => ({
      selectedPortfolioId,
      setSelectedPortfolioId,
      clearPortfolioFilter,
      portfolioCode,
      selectedLocationId,
      setSelectedLocationId,
      selectedYear,
      setSelectedYear,
      clearAllFilters,
      getActiveFilters
    }),
    [
      selectedPortfolioId,
      setSelectedPortfolioId,
      clearPortfolioFilter,
      portfolioCode,
      selectedLocationId,
      setSelectedLocationId,
      selectedYear,
      setSelectedYear,
      clearAllFilters,
      getActiveFilters
    ]
  );

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}

// Alias for consistency with Phase 6 documentation
export const usePortfolioContext = usePortfolio;
