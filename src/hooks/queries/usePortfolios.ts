import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { Portfolio } from '@/types/schema';

interface PortfolioWithTotals extends Portfolio {
  funding_sources?: any[];
  projects?: any[];
  totals?: {
    funding_sources: number;
    projects: number;
    commitment: number;
    drawn: number;
  };
}

interface UsePortfoliosOptions {
  activeOnly?: boolean;
}

// Helper for authenticated fetch
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` }),
  };
  
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...options.headers },
    credentials: 'include',
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Request failed');
  }
  
  return res.json();
}

// Fetch all portfolios
export function usePortfolios(options: UsePortfoliosOptions = {}) {
  const { activeOnly = true } = options;

  return useQuery({
    queryKey: ['portfolios', { activeOnly }],
    queryFn: async (): Promise<PortfolioWithTotals[]> => {
      const params = new URLSearchParams();
      if (!activeOnly) params.set('active', 'false');

      const response = await fetchWithAuth(`/api/portfolios?${params}`);
      return response.data.portfolios;
    },
  });
}

// Fetch single portfolio with details
export function usePortfolio(id: string | undefined) {
  return useQuery({
    queryKey: ['portfolios', id],
    queryFn: async (): Promise<PortfolioWithTotals> => {
      const response = await fetchWithAuth(`/api/portfolios/${id}`);
      return response.data.portfolio;
    },
    enabled: !!id,
  });
}

// Create portfolio
interface CreatePortfolioInput {
  name: string;
  code?: string;
  description?: string;
  owner_entity_id?: string;
}

export function useCreatePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePortfolioInput): Promise<Portfolio> => {
      const response = await fetchWithAuth('/api/portfolios', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return response.data.portfolio;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}

// Update portfolio
interface UpdatePortfolioInput {
  id: string;
  name?: string;
  code?: string;
  description?: string;
  owner_entity_id?: string;
  is_active?: boolean;
}

export function useUpdatePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdatePortfolioInput): Promise<Portfolio> => {
      const response = await fetchWithAuth(`/api/portfolios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return response.data.portfolio;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios', data.id] });
    },
  });
}

// Delete portfolio
export function useDeletePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await fetchWithAuth(`/api/portfolios/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}
