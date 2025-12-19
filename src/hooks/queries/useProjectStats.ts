import { useQuery } from '@tanstack/react-query';
import { ApiResponse } from '@/types/schema';

interface ProjectStats {
  project_id: number;
  project_name: string;
  total_locations: number;
  complete_locations: number;
  blocked_locations: number;
  total_tasks: number;
  verified_tasks: number;
  total_estimated_cost: number;
  verified_cost: number;
  completion_percentage: number;
}

const fetchProjectStats = async (projectId: number): Promise<ProjectStats> => {
  const res = await fetch(`/api/projects/${projectId}/stats`);
  if (!res.ok) throw new Error('Failed to fetch project stats');
  const json: ApiResponse<ProjectStats> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data!;
};

export function useProjectStats(projectId?: number) {
  return useQuery({
    queryKey: ['project-stats', projectId],
    queryFn: () => fetchProjectStats(projectId!),
    enabled: !!projectId,
    staleTime: 30 * 1000, // 30 seconds
  });
}
