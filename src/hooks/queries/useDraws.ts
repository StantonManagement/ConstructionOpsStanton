import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiResponse } from '@/types/schema';

// Types
export interface Draw {
  id: string;
  project_id: number;
  draw_number: number;
  amount_requested: number;
  amount_approved?: number;
  status: 'draft' | 'submitted' | 'approved' | 'funded' | 'rejected';
  submitted_at?: string;
  approved_at?: string;
  funded_at?: string;
  notes?: string;
  created_at: string;
  line_items?: DrawLineItem[];
  projects?: {
    name: string;
  };
}

export interface DrawLineItem {
  id: string;
  draw_id: string;
  task_id: string;
  budget_category_id?: number;
  amount: number;
  description?: string;
  task?: {
    id: string;
    name: string;
    status: string;
    verified_at?: string;
  };
  budget_category?: {
    id: number;
    category: string;
  };
}

// Fetchers
const fetchDraws = async (projectId: number): Promise<Draw[]> => {
  const res = await fetch(`/api/draws?project_id=${projectId}`);
  if (!res.ok) throw new Error('Failed to fetch draws');
  const json: ApiResponse<Draw[]> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data || [];
};

const fetchDraw = async (id: string): Promise<Draw> => {
  const res = await fetch(`/api/draws/${id}`);
  if (!res.ok) throw new Error('Failed to fetch draw');
  const json: ApiResponse<Draw> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data!;
};

// Hooks
export function useDraws(projectId?: number) {
  return useQuery({
    queryKey: ['draws', projectId],
    queryFn: () => fetchDraws(projectId!),
    enabled: !!projectId,
  });
}

export function useRenovationDraws(options: { property_id?: string; status?: string } = {}) {
  return useQuery<{ draws: Draw[]; total: number }>({
    queryKey: ['renovation-draws', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.property_id) params.set('property_id', options.property_id);
      if (options.status) params.set('status', options.status);
      
      const res = await fetch(`/api/renovations/draws?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch draws');
      return json.data;
    },
  });
}

export function useDrawEligibility() {
  return useQuery<{
    total_eligible: number;
    pending_draws_amount: number;
    pending_draws_count: number;
    by_property: any[];
  }>({
    queryKey: ['draws', 'eligibility'],
    queryFn: async () => {
      const res = await fetch('/api/renovations/draws/eligibility');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch eligibility');
      return json.data;
    },
  });
}

export function useDraw(id: string) {
  return useQuery({
    queryKey: ['draw', id],
    queryFn: () => fetchDraw(id),
    enabled: !!id,
  });
}

// Mutations
export function useCreateDraw() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ project_id, notes }: { project_id: number; notes?: string }) => {
      const res = await fetch('/api/draws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id, notes }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to create draw');
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.data) {
        queryClient.invalidateQueries({ queryKey: ['draws', data.data.project_id] });
      }
    },
  });
}

export function useUpdateDraw() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await fetch(`/api/draws/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to update draw');
      }
      return res.json();
    },
    onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['draw', data.data.id] });
    },
  });
}

export function useDeleteDraw() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: number }) => {
      const res = await fetch(`/api/draws/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to delete draw');
      }
      return { id, projectId };
    },
    onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['draws', data.projectId] });
    },
  });
}

export function useSubmitDraw() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/draws/${id}/submit`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to submit draw');
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.data) {
        queryClient.invalidateQueries({ queryKey: ['draw', data.data.id] });
        queryClient.invalidateQueries({ queryKey: ['draws', data.data.project_id] });
        queryClient.invalidateQueries({ queryKey: ['cash-flow', 'eligibility'] });
      }
    },
  });
}

export function useApproveDraw() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, amount_approved }: { id: string; amount_approved?: number }) => {
      const res = await fetch(`/api/draws/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_approved }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to approve draw');
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.data) {
        queryClient.invalidateQueries({ queryKey: ['draw', data.data.id] });
        queryClient.invalidateQueries({ queryKey: ['draws', data.data.project_id] });
      }
    },
  });
}

export function useFundDraw() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/draws/${id}/fund`, {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to fund draw');
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.data) {
        queryClient.invalidateQueries({ queryKey: ['draw', data.data.id] });
        queryClient.invalidateQueries({ queryKey: ['draws', data.data.project_id] });
      }
    },
  });
}

export function useAddDrawLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ drawId, taskId }: { drawId: string; taskId: string }) => {
      const res = await fetch(`/api/draws/${drawId}/line-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to add item to draw');
      }
      return res.json();
    },
    onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['draw', data.data.draw_id] });
        // Also invalidate eligibility
        queryClient.invalidateQueries({ queryKey: ['cash-flow', 'eligibility'] });
    },
  });
}

export function useRemoveDrawLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ drawId, lineItemId }: { drawId: string; lineItemId: string }) => {
      const res = await fetch(`/api/draws/${drawId}/line-items?line_item_id=${lineItemId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to remove item from draw');
      }
      return { drawId };
    },
    onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['draw', data.drawId] });
        // Also invalidate eligibility
        queryClient.invalidateQueries({ queryKey: ['cash-flow', 'eligibility'] });
    },
  });
}
