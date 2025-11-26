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




