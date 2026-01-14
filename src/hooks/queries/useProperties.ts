import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Property } from '@/types/schema';
import { supabase } from '@/lib/supabaseClient';

interface PropertiesResponse {
  success: boolean;
  data: Property[];
}

interface PropertyResponse {
  success: boolean;
  data: Property;
}

export function useProperties(portfolioId?: string) {
  return useQuery<Property[]>({
    queryKey: ['properties', portfolioId],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        console.error('[useProperties] No active session');
        return [];
      }

      const url = portfolioId 
        ? `/api/properties?portfolio_id=${portfolioId}`
        : '/api/properties';
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });
      if (!res.ok) {
        const error = await res.json();
        console.error('[useProperties] API error:', error);
        throw new Error('Failed to fetch properties');
      }
      const json: PropertiesResponse = await res.json();
      return json.data;
    },
  });
}

export function useProperty(id: string, include?: string[]) {
  return useQuery<Property>({
    queryKey: ['property', id, include],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        throw new Error('No active session');
      }

      const includeParam = include?.length ? `?include=${include.join(',')}` : '';
      const res = await fetch(`/api/properties/${id}${includeParam}`, {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch property');
      const json: PropertyResponse = await res.json();
      return json.data;
    },
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      portfolio_id: string;
      name: string;
      address?: string;
      owner_entity_id?: number;
      unit_count?: number;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        throw new Error('No active session');
      }

      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create property');
      }
      const json: PropertyResponse = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}

export function useUpdateProperty(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name?: string;
      address?: string;
      owner_entity_id?: number;
      unit_count?: number;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        throw new Error('No active session');
      }

      const res = await fetch(`/api/properties/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update property');
      }
      const json: PropertyResponse = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', id] });
    },
  });
}
