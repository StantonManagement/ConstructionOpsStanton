import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Component } from '@/types/schema';
import { supabase } from '@/lib/supabaseClient';

interface ComponentsResponse {
  success: boolean;
  data: Component[];
}

interface ComponentResponse {
  success: boolean;
  data: Component;
}

export function useComponents(filters?: {
  project_id?: number;
  property_id?: string;
  type?: string;
  status?: string;
}) {
  return useQuery<Component[]>({
    queryKey: ['components', filters],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        console.error('[useComponents] No active session');
        return [];
      }

      const params = new URLSearchParams();
      if (filters?.project_id) params.set('project_id', filters.project_id.toString());
      if (filters?.property_id) params.set('property_id', filters.property_id);
      if (filters?.type) params.set('type', filters.type);
      if (filters?.status) params.set('status', filters.status);

      const url = `/api/components${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });
      if (!res.ok) {
        const error = await res.json();
        console.error('[useComponents] API error:', error);
        throw new Error('Failed to fetch components');
      }
      const json: ComponentsResponse = await res.json();
      return json.data;
    },
  });
}

export function useComponent(id: string) {
  return useQuery<Component>({
    queryKey: ['component', id],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        throw new Error('No active session');
      }

      const res = await fetch(`/api/components/${id}`, {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch component');
      const json: ComponentResponse = await res.json();
      return json.data;
    },
    enabled: !!id,
  });
}

export function useCreateComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      project_id: number;
      property_id: string;
      name: string;
      type: 'unit' | 'common_area' | 'building_system' | 'exterior';
      unit_type?: 'studio' | '1BR' | '2BR' | '3BR';
      unit_number?: string;
      floor?: number;
    }) => {
      const res = await fetch('/api/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create component');
      }
      const json: ComponentResponse = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['components'] });
    },
  });
}

export function useUpdateComponent(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Component>) => {
      const res = await fetch(`/api/components/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update component');
      }
      const json: ComponentResponse = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['components'] });
      queryClient.invalidateQueries({ queryKey: ['component', id] });
    },
  });
}
