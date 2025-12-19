import { useQuery } from '@tanstack/react-query';
import { ApiResponse } from '@/types/schema';
import { authFetch } from '@/lib/authFetch';

export interface BlockingReportItem {
  location_id: string;
  location_name: string;
  project_id: number;
  project_name: string;
  blocked_note: string;
  blocked_since: string;
  affected_tasks: number;
  affected_cost: number;
}

export interface BlockingReportGroup {
  reason: string;
  count: number;
  affected_tasks: number;
  affected_cost: number;
  items: BlockingReportItem[];
}

export interface BlockingReportData {
  by_reason: Record<string, BlockingReportGroup>;
  total_blocked: number;
  total_affected_cost: number;
}

export interface TradeReportItem {
  task_id: string;
  task_name: string;
  location_name: string;
  status: string;
  assigned_contractor?: string;
}

export interface TradeReportGroup {
  category_id: number;
  category_name: string;
  total_tasks: number;
  verified_tasks: number;
  in_progress_tasks: number;
  not_started_tasks: number;
  total_estimated_cost: number;
  verified_cost: number;
  tasks: TradeReportItem[];
}

export interface TradeCategoryOption {
  category_id: number;
  category_name: string;
}

export interface TradeReportData {
  categories: TradeCategoryOption[];
  trades: TradeReportGroup[];
  unassigned_count: number;
}

// Fetchers
const fetchBlockingReport = async (projectId?: number): Promise<BlockingReportData> => {
  const params = new URLSearchParams();
  if (projectId) params.append('project_id', projectId.toString());
  
  const res = await authFetch(`/api/reports/blocking?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch blocking report');
  const json: ApiResponse<BlockingReportData> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data!;
};

const fetchTradeReport = async (projectId: number, budgetCategoryId?: number): Promise<TradeReportData> => {
  const params = new URLSearchParams();
  params.append('project_id', projectId.toString());
  if (budgetCategoryId) params.append('budget_category_id', budgetCategoryId.toString());

  const res = await authFetch(`/api/reports/trade?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch trade report');
  const json: ApiResponse<TradeReportData> = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data!;
};

// Hooks
export function useBlockingReport(projectId?: number) {
  return useQuery({
    queryKey: ['blocking-report', projectId],
    queryFn: () => fetchBlockingReport(projectId),
    staleTime: 60 * 1000,
  });
}

export function useTradeReport(projectId?: number, budgetCategoryId?: number) {
  return useQuery({
    queryKey: ['trade-report', projectId, budgetCategoryId],
    queryFn: () => fetchTradeReport(projectId!, budgetCategoryId),
    enabled: !!projectId,
    staleTime: 60 * 1000,
  });
}
