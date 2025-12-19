import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task, CreateTaskInput, TaskStatus, ApiResponse } from '@/types/schema';

// Helper for fetching
const fetchTasks = async (locationId: string): Promise<Task[]> => {
  const res = await fetch(`/api/tasks?location_id=${locationId}`);
  if (!res.ok) throw new Error('Failed to fetch tasks');
  const json: ApiResponse<Task[]> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data || [];
};

const fetchTask = async (id: string): Promise<Task> => {
  const res = await fetch(`/api/tasks/${id}`);
  if (!res.ok) throw new Error('Failed to fetch task');
  const json: ApiResponse<Task> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data!;
};

// Hooks
export function useTasks(locationId?: string) {
  return useQuery({
    queryKey: ['tasks', locationId],
    queryFn: () => fetchTasks(locationId!),
    enabled: !!locationId,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => fetchTask(id),
    enabled: !!id,
  });
}

// Mutations
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskInput) => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create task');
      const json: ApiResponse<Task> = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.location_id] });
      queryClient.invalidateQueries({ queryKey: ['locations'] }); // To update counts
      queryClient.invalidateQueries({ queryKey: ['location', variables.location_id] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Task> }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update task');
      const json: ApiResponse<Task> = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['task', data.id] });
        queryClient.invalidateQueries({ queryKey: ['tasks', data.location_id] });
        queryClient.invalidateQueries({ queryKey: ['locations'] }); // To update counts
      }
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, locationId }: { id: string; locationId: string }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete task');
      return { id, locationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.locationId] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, verification_photo_url, verification_notes }: { 
      id: string; 
      status: TaskStatus;
      verification_photo_url?: string;
      verification_notes?: string;
    }) => {
      const res = await fetch(`/api/tasks/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, verification_photo_url, verification_notes }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update task status');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      if (data && data.data) {
        queryClient.invalidateQueries({ queryKey: ['task', data.data.id] });
        queryClient.invalidateQueries({ queryKey: ['tasks', data.data.location_id] });
        queryClient.invalidateQueries({ queryKey: ['locations'] });
      }
    },
  });
}

export function useVerifyTask() {
  const updateStatus = useUpdateTaskStatus();
  
  return useMutation({
    mutationFn: async ({ 
      taskId, 
      locationId, 
      photoFile, 
      notes 
    }: { 
      taskId: string; 
      locationId: string; 
      photoFile: File; 
      notes?: string;
    }) => {
      // 1. Upload photo
      const formData = new FormData();
      formData.append('file', photoFile);
      formData.append('taskId', taskId);
      formData.append('locationId', locationId);
      
      const uploadRes = await fetch('/api/upload/verification-photo', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        throw new Error(error.error || 'Failed to upload photo');
      }
      
      const { data: { url } } = await uploadRes.json();
      
      // 2. Update status
      return updateStatus.mutateAsync({
        id: taskId,
        status: 'verified',
        verification_photo_url: url,
        verification_notes: notes
      });
    }
  });
}
