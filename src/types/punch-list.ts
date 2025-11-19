// Punch List Types

export type PunchListSeverity = 'critical' | 'high' | 'medium' | 'low';

export type PunchListStatus = 'open' | 'in_progress' | 'completed' | 'verified' | 'rejected';

export interface PunchListCategory {
  id: number;
  name: string;
  icon?: string;
  color?: string;
  created_at: string;
}

export interface PunchListItem {
  id: number;
  project_id: number;
  item_number: string;
  contractor_id?: number;
  description: string;
  location?: string;
  unit_number?: string;
  trade_category?: string;
  severity: PunchListSeverity;
  status: PunchListStatus;
  due_date?: string;
  created_by?: string;
  assigned_to?: number;
  completed_by?: string;
  verified_by?: string;
  created_at: string;
  updated_at: string;
  completed_date?: string;
  verified_date?: string;
  notes?: string;
  
  // Joined data
  project_name?: string;
  contractor_name?: string;
  assigned_contractor_name?: string;
  photo_count?: number;
  comment_count?: number;
}

export interface PunchListComment {
  id: number;
  punch_item_id: number;
  author_id: string;
  comment_text: string;
  attachment_url?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  author_name?: string;
  author_email?: string;
}

export interface PunchListSummary {
  project_id: number;
  total_items: number;
  open_items: number;
  in_progress_items: number;
  completed_items: number;
  verified_items: number;
  overdue_items: number;
  critical_items: number;
  high_severity_items: number;
}

export interface CreatePunchListItemRequest {
  project_id: number;
  contractor_id?: number;
  description: string;
  location?: string;
  unit_number?: string;
  trade_category?: string;
  severity: PunchListSeverity;
  assigned_to?: number;
  due_date?: string;
  notes?: string;
}

export interface UpdatePunchListItemRequest {
  contractor_id?: number;
  description?: string;
  location?: string;
  unit_number?: string;
  trade_category?: string;
  severity?: PunchListSeverity;
  status?: PunchListStatus;
  assigned_to?: number;
  due_date?: string;
  notes?: string;
}

export interface PunchListFilters {
  project_id?: number;
  contractor_id?: number;
  status?: PunchListStatus;
  severity?: PunchListSeverity;
  assigned_to?: number;
  overdue?: boolean;
  search?: string;
}

