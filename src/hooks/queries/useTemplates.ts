import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ScopeTemplate, 
  TemplateWithTasks, 
  TemplateTask, 
  CreateTemplateInput, 
  CreateTemplateTaskInput, 
  ApplyTemplateInput 
} from '@/types/schema';
import { authFetch } from '@/lib/authFetch';

// Fetch all templates
async function fetchTemplates(activeOnly = false): Promise<ScopeTemplate[]> {
  const params = new URLSearchParams();
  if (activeOnly) params.append('active', 'true');
  
  const res = await authFetch(`/api/templates?${params.toString()}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch templates');
  }
  const json = await res.json();
  return json.data;
}

// Fetch single template with tasks
async function fetchTemplate(id: string): Promise<TemplateWithTasks> {
  const res = await authFetch(`/api/templates/${id}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch template');
  }
  const json = await res.json();
  return json.data;
}

// Hooks

export function useTemplates(activeOnly = false) {
  return useQuery({
    queryKey: ['templates', { activeOnly }],
    queryFn: () => fetchTemplates(activeOnly),
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['template', id],
    queryFn: () => fetchTemplate(id),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateTemplateInput) => {
      const res = await authFetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create template');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ScopeTemplate> }) => {
      const res = await authFetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update template');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', variables.id] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/templates/${id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete template');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

export function useAddTemplateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateTemplateTaskInput) => {
      const res = await authFetch(`/api/templates/${data.template_id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add task to template');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['template', variables.template_id] });
    },
  });
}

export function useApplyTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ templateId, locationIds }: { templateId: string; locationIds: string[] }) => {
      const res = await authFetch(`/api/templates/${templateId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_ids: locationIds }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to apply template');
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate both locations (to see updated counts) and tasks
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTemplateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TemplateTask> }) => {
      const res = await authFetch(`/api/template-tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update template task');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['template', data.template_id] });
    },
  });
}

export function useDeleteTemplateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, templateId }: { id: string; templateId: string }) => {
      const res = await authFetch(`/api/template-tasks/${id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete template task');
      }
      return { id, templateId };
    },
    onSuccess: ({ templateId }) => {
      queryClient.invalidateQueries({ queryKey: ['template', templateId] });
    },
  });
}
