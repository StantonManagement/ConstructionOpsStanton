import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { FundingSource } from '@/types/schema';

interface FundingSourceWithPortfolio extends FundingSource {
  portfolio?: {
    id: string;
    name: string;
    code: string;
  };
}

interface UseFundingSourcesOptions {
  portfolioId?: string;
  type?: 'loan' | 'grant' | 'equity' | 'other';
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

// Fetch funding sources with optional filters
export function useFundingSources(options: UseFundingSourcesOptions = {}) {
  const { portfolioId, type, activeOnly = true } = options;

  return useQuery({
    queryKey: ['funding-sources', { portfolioId, type, activeOnly }],
    queryFn: async (): Promise<FundingSourceWithPortfolio[]> => {
      const params = new URLSearchParams();
      if (portfolioId) params.set('portfolio_id', portfolioId);
      if (type) params.set('type', type);
      if (!activeOnly) params.set('active', 'false');

      const response = await fetchWithAuth(`/api/funding-sources?${params}`);
      return response.data.funding_sources;
    },
  });
}

// Fetch single funding source
export function useFundingSource(id: string | undefined) {
  return useQuery({
    queryKey: ['funding-sources', id],
    queryFn: async (): Promise<FundingSourceWithPortfolio> => {
      const response = await fetchWithAuth(`/api/funding-sources/${id}`);
      return response.data.funding_source;
    },
    enabled: !!id,
  });
}

// Create funding source
interface CreateFundingSourceInput {
  portfolio_id: string;
  name: string;
  type: 'loan' | 'grant' | 'equity' | 'other';
  lender_name?: string;
  commitment_amount?: number;
  drawn_amount?: number;
  interest_rate?: number;
  maturity_date?: string;
  loan_number?: string;
  notes?: string;
}

export function useCreateFundingSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFundingSourceInput): Promise<FundingSourceWithPortfolio> => {
      const response = await fetchWithAuth('/api/funding-sources', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return response.data.funding_source;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['funding-sources'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios', data.portfolio_id] });
      queryClient.invalidateQueries({ queryKey: ['cash-position'] });
    },
  });
}

// Update funding source
interface UpdateFundingSourceInput {
  id: string;
  portfolio_id?: string;
  name?: string;
  type?: 'loan' | 'grant' | 'equity' | 'other';
  lender_name?: string;
  commitment_amount?: number;
  drawn_amount?: number;
  interest_rate?: number;
  maturity_date?: string;
  loan_number?: string;
  notes?: string;
  is_active?: boolean;
}

export function useUpdateFundingSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateFundingSourceInput): Promise<FundingSourceWithPortfolio> => {
      const response = await fetchWithAuth(`/api/funding-sources/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return response.data.funding_source;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['funding-sources'] });
      queryClient.invalidateQueries({ queryKey: ['funding-sources', data.id] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['cash-position'] });
    },
  });
}

// Delete funding source
export function useDeleteFundingSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ deleted: boolean; soft_delete: boolean }> => {
      const response = await fetchWithAuth(`/api/funding-sources/${id}`, {
        method: 'DELETE',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funding-sources'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['cash-position'] });
    },
  });
}
