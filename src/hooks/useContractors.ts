/**
 * Custom Hook for Contractor Data Management
 * Following Single Responsibility - manages contractor data state and fetching
 */

import { useState, useEffect, useCallback } from 'react';
import { ContractorService, type ContractWithContractor } from '@/lib/contractors/service';

export function useContractors(projectId: number) {
  const [contractors, setContractors] = useState<ContractWithContractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContractors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ContractorService.fetchProjectContractors(projectId);
      setContractors(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch contractors';
      setError(errorMessage);
      console.error('Error fetching contractors:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchContractors();
  }, [fetchContractors]);

  const refreshContractors = useCallback(() => {
    return fetchContractors();
  }, [fetchContractors]);

  const updateLocalContractors = useCallback((updater: (prev: ContractWithContractor[]) => ContractWithContractor[]) => {
    setContractors(updater);
  }, []);

  return {
    contractors,
    loading,
    error,
    refreshContractors,
    updateLocalContractors,
  };
}
