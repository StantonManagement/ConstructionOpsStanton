export type ScheduleStatus = 'on_track' | 'at_risk' | 'delayed' | 'completed';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold';
export type DependencyType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
export type MilestoneStatus = 'pending' | 'completed' | 'missed';

export interface ProjectSchedule {
  id: string;
  project_id: number;
  start_date: string; // YYYY-MM-DD
  target_end_date: string; // YYYY-MM-DD
  actual_end_date?: string; // YYYY-MM-DD
  status: ScheduleStatus;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ScheduleTask {
  id: string;
  schedule_id: string;
  contractor_id?: number;
  contractor_name?: string; // For UI convenience (joined)
  task_name: string;
  description?: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  duration_days: number;
  progress: number; // 0-100
  status: TaskStatus;
  parent_task_id?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // For UI:
  dependencies?: string[]; // Array of predecessor task IDs
}

export interface ScheduleDependency {
  id: string;
  source_task_id: string;
  target_task_id: string;
  dependency_type: DependencyType;
  lag_days: number;
}

export interface ScheduleMilestone {
  id: string;
  schedule_id: string;
  name: string;
  target_date: string; // YYYY-MM-DD
  actual_date?: string;
  status: MilestoneStatus;
  created_at: string;
}

// Request types
export interface CreateScheduleRequest {
  project_id: number;
  start_date: string;
  target_end_date: string;
}

export interface CreateTaskRequest {
  schedule_id: string;
  contractor_id?: number;
  task_name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status?: TaskStatus;
  progress?: number;
  parent_task_id?: string;
  predecessors?: string[]; // IDs of tasks that this task depends on (default Finish-to-Start)
}

export interface UpdateTaskRequest {
  contractor_id?: number;
  task_name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: TaskStatus;
  progress?: number;
  parent_task_id?: string;
  predecessors?: string[]; // Full replacement of dependencies
}

