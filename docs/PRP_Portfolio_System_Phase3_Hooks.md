# PRP: Portfolio System — Phase 3: React Query Hooks

## Objective
Create React Query hooks for portfolios and funding sources following existing patterns.

---

## Pre-Flight

```bash
# MCP: Check existing hook structure
ls -la src/hooks/queries/

# MCP: Reference existing hook pattern (especially useCashPosition for auth header)
cat src/hooks/queries/useCashPosition.ts
cat src/hooks/queries/useProjects.ts
```

---

## 3.0 Auth Header Helper

All hooks need proper authentication headers. Add this helper or use existing pattern:

```typescript
// Helper function for authenticated fetches
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` }),
    ...options.headers,
  };
  
  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Request failed');
  }
  
  return res.json();
}
```

---

## 3.1 Portfolio Hooks

### File: `src/hooks/queries/usePortfolios.ts`

```typescript
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

      const data = await fetchWithAuth(`/api/portfolios?${params}`);
      return data.portfolios;
    },
  });
}

// Fetch single portfolio with details
export function usePortfolio(id: string | undefined) {
  return useQuery({
    queryKey: ['portfolios', id],
    queryFn: async (): Promise<PortfolioWithTotals> => {
      const data = await fetchWithAuth(`/api/portfolios/${id}`);
      return data.portfolio;
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
      const data = await fetchWithAuth('/api/portfolios', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return data.portfolio;
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
      const data = await fetchWithAuth(`/api/portfolios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return data.portfolio;
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
```

---

## 3.2 Funding Source Hooks

### File: `src/hooks/queries/useFundingSources.ts`

```typescript
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

// Helper for authenticated fetch (same as portfolios)
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

      const data = await fetchWithAuth(`/api/funding-sources?${params}`);
      return data.funding_sources;
    },
  });
}

// Fetch single funding source
export function useFundingSource(id: string | undefined) {
  return useQuery({
    queryKey: ['funding-sources', id],
    queryFn: async (): Promise<FundingSourceWithPortfolio> => {
      const data = await fetchWithAuth(`/api/funding-sources/${id}`);
      return data.funding_source;
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
      const data = await fetchWithAuth('/api/funding-sources', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return data.funding_source;
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
      const data = await fetchWithAuth(`/api/funding-sources/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return data.funding_source;
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
      const data = await fetchWithAuth(`/api/funding-sources/${id}`, {
        method: 'DELETE',
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funding-sources'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['cash-position'] });
    },
  });
}
```

---

## 3.3 Update hooks index (if exists)

```bash
# MCP: Check if index file exists
cat src/hooks/queries/index.ts 2>/dev/null || echo "No index file"
```

If index exists, add exports:
```typescript
export * from './usePortfolios';
export * from './useFundingSources';
```

---

## Verification Checklist

```bash
# MCP: Verify files created
ls -la src/hooks/queries/usePortfolios.ts
ls -la src/hooks/queries/useFundingSources.ts
```

- [ ] usePortfolios.ts created with all hooks
- [ ] useFundingSources.ts created with all hooks
- [ ] No TypeScript errors
- [ ] Query keys are consistent (arrays with objects for params)
- [ ] All mutations invalidate appropriate queries
- [ ] cash-position queries invalidated when funding sources change

---

## Stop Gate

Do NOT proceed to Phase 4 until:
1. Both hook files created
2. TypeScript compiles without errors
3. Hooks follow existing patterns in the codebase
