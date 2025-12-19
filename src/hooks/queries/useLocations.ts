import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Location, CreateLocationInput, LocationStatus, ApiResponse } from '@/types/schema';
import { authFetch } from '@/lib/authFetch';

// Helper for fetching
const fetchLocations = async (projectId: number): Promise<Location[]> => {
  const res = await authFetch(`/api/locations?project_id=${projectId}`);
  if (!res.ok) throw new Error('Failed to fetch locations');
  const json: ApiResponse<Location[]> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data || [];
};

const fetchLocation = async (id: string): Promise<Location> => {
  const res = await authFetch(`/api/locations/${id}`);
  if (!res.ok) throw new Error('Failed to fetch location');
  const json: ApiResponse<Location> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data!;
};

// Hooks
export function useLocations(projectId?: number) {
  return useQuery({
    queryKey: ['locations', projectId],
    queryFn: () => fetchLocations(projectId!),
    enabled: !!projectId,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useLocation(id: string) {
  return useQuery({
    queryKey: ['location', id],
    queryFn: () => fetchLocation(id),
    enabled: !!id,
  });
}

// Mutations
export function useCreateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLocationInput) => {
      const res = await authFetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create location');
      const json: ApiResponse<Location> = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['locations', variables.project_id] });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Location> }) => {
      const res = await authFetch(`/api/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update location');
      const json: ApiResponse<Location> = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['location', data.id] });
        queryClient.invalidateQueries({ queryKey: ['locations', data.project_id] });
      }
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/locations/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete location');
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

export function useBulkCreateLocations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await authFetch('/api/locations/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to bulk create locations');
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['locations', variables.project_id] });
      // Also invalidate tasks if template was applied
      if (variables.template_id) {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
    },
  });
}

export function useBlockLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason, note }: { id: string; reason: string; note?: string }) => {
      const res = await authFetch(`/api/locations/${id}/block`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_reason: reason, blocked_note: note }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to block location');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      if (data && data.data) {
        queryClient.invalidateQueries({ queryKey: ['location', data.data.id] });
        queryClient.invalidateQueries({ queryKey: ['locations', data.data.project_id] });
      }
    },
  });
}

export function useUnblockLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/locations/${id}/block`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to unblock location');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      if (data && data.data) {
        queryClient.invalidateQueries({ queryKey: ['location', data.data.id] });
        queryClient.invalidateQueries({ queryKey: ['locations', data.data.project_id] });
      }
    },
  });
}
