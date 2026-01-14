'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface PortfolioContextType {
  selectedPortfolioId: string | null;
  setSelectedPortfolioId: (id: string | null) => void;
  clearPortfolioFilter: () => void;
  portfolioCode: string | null;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const portfolioParam = searchParams.get('portfolio');
  const selectedPortfolioId = useMemo(() => {
    return portfolioParam && portfolioParam !== 'all' ? portfolioParam : null;
  }, [portfolioParam]);

  const setSelectedPortfolioId = React.useCallback((id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set('portfolio', id);
    } else {
      params.delete('portfolio');
    }
    
    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    router.push(newUrl, { scroll: false });
  }, [searchParams, pathname, router]);

  const clearPortfolioFilter = React.useCallback(() => {
    setSelectedPortfolioId(null);
  }, [setSelectedPortfolioId]);

  const portfolioCode = portfolioParam || null;

  const value = useMemo(
    () => ({ selectedPortfolioId, setSelectedPortfolioId, clearPortfolioFilter, portfolioCode }),
    [selectedPortfolioId, setSelectedPortfolioId, clearPortfolioFilter, portfolioCode]
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
