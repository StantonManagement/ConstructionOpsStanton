import { useQuery } from '@tanstack/react-query';
import { authFetch } from '@/lib/authFetch';

export interface PortfolioStats {
  total_locations: number;
  complete_locations: number;
  total_tasks: number;
  verified_tasks: number;
  total_estimated_cost: number;
  verified_cost: number;
  blocked_locations: number;
  blocked_by_reason: {
    materials: number;
    labor: number;
    cash: number;
    dependency: number;
    other: number;
  };
}

export interface PropertyWithStats {
  project_id: number;
  project_name: string;
  total_locations: number;
  complete_locations: number;
  total_tasks: number;
  verified_tasks: number;
  blocked_locations: number;
  total_estimated_cost: number;
  verified_cost: number;
  completion_percentage: number;
}

export function usePortfolioStats() {
  return useQuery<PortfolioStats>({
    queryKey: ['portfolio', 'stats'],
    queryFn: async () => {
      const res = await authFetch('/api/renovations/portfolio/stats');
      if (!res.ok) throw new Error('Failed to fetch portfolio stats');
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function usePortfolioProperties(options?: { search?: string; sort?: string; order?: 'asc' | 'desc' }) {
  return useQuery<{ properties: PropertyWithStats[] }>({
    queryKey: ['portfolio', 'properties', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.search) params.set('search', options.search);
      if (options?.sort) params.set('sort', options.sort);
      if (options?.order) params.set('order', options.order);
      
      const res = await authFetch(`/api/renovations/portfolio/properties?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch portfolio properties');
      return res.json();
    },
  });
}
