import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface BacklogItem {
  id: string;
  title: string;
  description?: string;
  scope_level: 'portfolio' | 'property';
  portfolio_id: string;
  property_id?: number;
  estimated_cost?: number;
  status: string;
  converted_to_project_id?: number;
  created_at: string;
  updated_at?: string;
  portfolio?: {
    id: string;
    name: string;
    code: string;
  };
  property?: {
    id: number;
    name: string;
    address: string;
  };
}

interface ConvertToProjectRequest {
  property_id: number;
  name?: string;
  budget?: number;
  start_date?: string;
  target_completion_date?: string;
  description?: string;
}

export function useBacklog(options?: {
  portfolioId?: string;
  propertyId?: string;
  status?: string;
}) {
  return useQuery<{ items: BacklogItem[] }>({
    queryKey: ['backlog', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.portfolioId) params.set('portfolio_id', options.portfolioId);
      if (options?.propertyId) params.set('property_id', options.propertyId);
      if (options?.status) params.set('status', options.status);
      
      const res = await fetch(`/api/backlog?${params}`);
      if (!res.ok) throw new Error('Failed to fetch backlog');
      return res.json();
    },
  });
}

export function useConvertToProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      backlogId, 
      ...data 
    }: { backlogId: string } & ConvertToProjectRequest) => {
      const res = await fetch(`/api/backlog/${backlogId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to convert');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
