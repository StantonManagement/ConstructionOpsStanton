export interface Project {
  id: number;
  name: string;
  client_name: string;
  current_phase: string;
  daysToInspection: number;
  atRisk: boolean;
  budget: number;
  spent: number;
  permits: { [key: string]: string };
  status?: string;
  address?: string;
  start_date?: string;
  target_completion_date?: string;
  end_date?: string;
  owner_entity_id?: number;
  portfolio_name?: string;
  total_units?: number;
  // Calculated fields from enhanced queries
  calculatedBudget?: number;
  calculatedSpent?: number;
  stats?: {
    totalContractors: number;
    activePaymentApps: number;
    completedPaymentApps: number;
    totalBudget: number;
    totalSpent: number;
    completionPercentage: number;
  };
}

export interface Subcontractor {
  id: number;
  name: string;
  trade: string;
  contractAmount: number;
  paidToDate: number;
  lastPayment: string;
  status: string;
  changeOrdersPending: boolean;
  lineItemCount: number;
  phone: string;
  email?: string;
  hasOpenPaymentApp: boolean;
  compliance: { insurance: string; license: string };
  performance_score?: number;
}

export interface PaymentApplication {
  id: number;
  contractor: string;
  project: string;
  amount: number;
  daysOverdue?: number;
  submittedAmount?: number;
  photosNeeded?: boolean;
  photosSubmitted?: boolean;
  lienWaiverNeeded?: boolean;
  lienWaiverSigned?: boolean;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentApplicationsState {
  awaitingSMS: PaymentApplication[];
  pmReview: PaymentApplication[];
  checkReady: PaymentApplication[];
}

export interface Contract {
  id: number;
  project_id: number;
  subcontractor_id: number;
  contract_amount: number;
  contract_nickname?: string;
  start_date: string;
  end_date?: string;
  status?: string;
  project?: Project;
  subcontractor?: Subcontractor;
  contractors?: {
    id: number;
    name: string;
    trade: string;
    phone?: string;
    email?: string;
  };
}

export interface Budget {
  id: number;
  project_id: number;
  category: string;
  original_amount: number;
  revised_amount: number;
  remaining_amount: number;
  notes?: string;
  status?: string;
}

export interface User {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  aud?: string;
  confirmed_at?: string;
  last_sign_in_at?: string;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
  user_metadata?: {
    name?: string;
    [key: string]: any;
  };
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// --- Task Management Types ---

export type LocationType = 'unit' | 'common_area' | 'exterior' | 'building_wide';
export type UnitType = 'studio' | '1BR' | '2BR' | '3BR';
export type LocationStatus = 'not_started' | 'in_progress' | 'complete' | 'on_hold';
export type BlockedReason = 'materials' | 'labor' | 'cash' | 'dependency' | 'other';

export interface Location {
  id: string; // UUID
  project_id: number; // Links to projects.id (BIGINT)
  name: string;
  type: LocationType;
  unit_type?: UnitType;
  unit_number?: string;
  floor?: number;
  status: LocationStatus;
  blocked_reason?: BlockedReason;
  blocked_note?: string;
  template_applied_id?: string;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
  // Derived/Joined fields
  tasks?: Task[];
  task_count?: number;
  completed_task_count?: number;
}

export interface CreateLocationInput {
  project_id: number;
  name: string;
  type: LocationType;
  unit_type?: UnitType;
  unit_number?: string;
  floor?: number;
  status?: LocationStatus;
}

export type TaskStatus = 'not_started' | 'in_progress' | 'worker_complete' | 'verified';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string; // UUID
  location_id: string; // UUID
  name: string;
  description?: string;
  status: TaskStatus;
  priority: PriorityLevel;
  assigned_contractor_id?: number; // BIGINT
  budget_category_id?: number; // BIGINT
  estimated_cost?: number;
  actual_cost?: number;
  duration_days?: number;
  scheduled_start?: string; // Date string YYYY-MM-DD
  scheduled_end?: string; // Date string YYYY-MM-DD
  worker_completed_at?: string; // ISO timestamp
  verified_at?: string; // ISO timestamp
  verified_by?: string; // UUID
  verification_photo_url?: string;
  verification_notes?: string;
  sort_order: number;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  location?: Location;
  contractor?: { name: string };
}

export interface CreateTaskInput {
  location_id: string;
  name: string;
  description?: string;
  status?: TaskStatus;
  priority?: PriorityLevel;
  assigned_contractor_id?: number;
  budget_category_id?: number;
  estimated_cost?: number;
  duration_days?: number;
  scheduled_start?: string;
  scheduled_end?: string;
}

// --- Phase 2: Templates ---

export interface ScopeTemplate {
  id: string; // UUID
  name: string;
  description?: string;
  unit_type?: UnitType | null; // Null means applies to any
  is_active: boolean;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
  // Derived
  task_count?: number;
}

export interface TemplateTask {
  id: string; // UUID
  template_id: string; // UUID
  name: string;
  description?: string;
  default_duration_days?: number;
  default_budget_category_id?: number; // BIGINT
  estimated_cost?: number;
  sort_order: number;
  depends_on_sort_order?: number; // Added for Phase 6
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateWithTasks extends ScopeTemplate {
  tasks: TemplateTask[];
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  unit_type?: UnitType | null;
}

export interface CreateTemplateTaskInput {
  template_id: string;
  name: string;
  description?: string;
  default_duration_days?: number;
  default_budget_category_id?: number;
  estimated_cost?: number;
  sort_order?: number;
  depends_on_sort_order?: number; // Added for Phase 6
}

export interface BulkLocationInput {
  project_id: number;
  start_number: number;
  end_number: number;
  prefix?: string;
  type: LocationType;
  unit_type?: UnitType;
  floor?: number;
  template_id?: string; // Optional: apply template immediately
}

export interface ApplyTemplateInput {
  location_ids: string[];
}




