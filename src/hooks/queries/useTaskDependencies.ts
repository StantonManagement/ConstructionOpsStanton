import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiResponse } from '@/types/schema';
import { authFetch } from '@/lib/authFetch';

// Types
export interface TaskDependency {
  id: string;
  depends_on_task: {
    id: string;
    name: string;
    status: string;
    scheduled_end?: string;
  };
}

export interface TaskDependent {
  id: string;
  task: {
    id: string;
    name: string;
    status: string;
    scheduled_start?: string;
    scheduled_end?: string;
  };
}

// Fetchers
const fetchDependencies = async (taskId: string): Promise<TaskDependency[]> => {
  const res = await authFetch(`/api/tasks/${taskId}/dependencies`);
  if (!res.ok) throw new Error('Failed to fetch dependencies');
  const json: ApiResponse<TaskDependency[]> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data || [];
};

const fetchDependents = async (taskId: string): Promise<TaskDependent[]> => {
  const res = await authFetch(`/api/tasks/${taskId}/dependents`);
  if (!res.ok) throw new Error('Failed to fetch dependents');
  const json: ApiResponse<TaskDependent[]> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data || [];
};

// Hooks
export function useTaskDependencies(taskId: string) {
  return useQuery({
    queryKey: ['task-dependencies', taskId],
    queryFn: () => fetchDependencies(taskId),
    enabled: !!taskId,
  });
}

export function useTaskDependents(taskId: string) {
  return useQuery({
    queryKey: ['task-dependents', taskId],
    queryFn: () => fetchDependents(taskId),
    enabled: !!taskId,
  });
}

export function useAddDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, dependsOnTaskId }: { taskId: string; dependsOnTaskId: string }) => {
      const res = await authFetch(`/api/tasks/${taskId}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depends_on_task_id: dependsOnTaskId }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to add dependency');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', variables.taskId] });
    },
  });
}

export function useRemoveDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, dependsOnTaskId }: { taskId: string; dependsOnTaskId: string }) => {
      const res = await authFetch(`/api/tasks/${taskId}/dependencies?depends_on_task_id=${dependsOnTaskId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to remove dependency');
      }
      return { taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', data.taskId] });
    },
  });
}
