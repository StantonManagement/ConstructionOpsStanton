import { useQuery } from '@tanstack/react-query';
import { ApiResponse } from '@/types/schema';
import { authFetch } from '@/lib/authFetch';

// Types
export interface CashFlowForecastWeek {
  week_start: string;
  forecasted_cost: number;
  by_category: {
    category: string;
    cost: number;
    task_count: number;
  }[];
}

export interface CashFlowForecast {
  project_id: string;
  total_forecast: number;
  weeks: CashFlowForecastWeek[];
}

export interface DrawEligibilityCategory {
  category: string;
  verified_cost: number;
  already_drawn: number;
  eligible: number;
  verified_task_count: number;
}

export interface EligibleTask {
  task_id: string;
  task_name: string;
  location_name: string;
  cost: number;
  verified_at: string;
}

export interface DrawEligibility {
  project_id: string;
  total_verified_cost: number;
  total_already_drawn: number;
  total_eligible: number;
  by_category: DrawEligibilityCategory[];
  eligible_tasks: EligibleTask[];
}

// Fetchers
const fetchForecast = async (projectId: number, weeks: number = 4): Promise<CashFlowForecast> => {
  const params = new URLSearchParams({ 
    project_id: projectId.toString(),
    weeks: weeks.toString() 
  });
  
  const res = await authFetch(`/api/cash-flow/forecast?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch forecast');
  const json: ApiResponse<CashFlowForecast> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data!;
};

const fetchDrawEligibility = async (projectId: number): Promise<DrawEligibility> => {
  const params = new URLSearchParams({ project_id: projectId.toString() });
  
  const res = await authFetch(`/api/cash-flow/draw-eligibility?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch draw eligibility');
  const json: ApiResponse<DrawEligibility> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data!;
};

// Hooks
export function useForecast(projectId?: number, weeks: number = 4) {
  return useQuery({
    queryKey: ['cash-flow', 'forecast', projectId, weeks],
    queryFn: () => fetchForecast(projectId!, weeks),
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
}

export function useDrawEligibility(projectId?: number) {
  return useQuery({
    queryKey: ['cash-flow', 'eligibility', projectId],
    queryFn: () => fetchDrawEligibility(projectId!),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}
