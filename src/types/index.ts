
// Project Types
export interface Project {
  id: string;
  name: string;
  client_name: string;
  current_phase: string;
  budget: number;
  start_date: string;
  target_completion_date: string;
  calculatedBudget?: number;
  calculatedSpent?: number;
  spent?: number;
}

// Payment Types
export interface PaymentApplication {
  id: string;
  project_id: string;
  contractor_id: string;
  period_ending: string;
  application_number: number;
  status: 'pending' | 'approved' | 'rejected';
  total_amount: number;
}

// Contractor Types
export interface Contractor {
  id: string;
  name: string;
  email: string;
  phone: string;
  trade: string;
}

// Daily Log Types
export interface DailyLog {
  id: string;
  project_id: string;
  date: string;
  weather: string;
  crew_count: number;
  activities: string;
  issues: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
}

// Form Types
export interface FormData {
  [key: string]: string | number | boolean | undefined;
}

// API Response Types
export interface APIResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
}
