import { usePortfolioContext } from '@/context/PortfolioContext';

/**
 * Hook to get the current portfolio filter for use in queries.
 * Returns undefined if no portfolio is selected (fetch all).
 */
export function usePortfolioFilter() {
  const { selectedPortfolioId } = usePortfolioContext();
  return selectedPortfolioId || undefined;
}
