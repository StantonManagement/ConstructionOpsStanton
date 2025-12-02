export interface ConstructionLoan {
  id: number;
  project_id: number;
  lender_name: string;
  loan_number: string;
  total_amount: number;
  close_date?: string;
  maturity_date?: string;
  interest_rate?: number;
  status: 'active' | 'closed' | 'defaulted';
  created_at: string;
  updated_at: string;
}

export interface LoanBudgetItem {
  id: number;
  loan_id: number;
  category_name: string;
  original_budget: number;
  locked_at?: string;
  locked_by?: string;
  approved_change_orders: number;
  display_order: number;
  notes?: string;
  created_at: string;
  updated_at: string;

  // Computed/UI fields
  revised_budget: number;
  drawn_amount: number;
  remaining_amount: number;
}

export interface LoanDraw {
  id: number;
  loan_id: number;
  draw_number: number;
  request_date: string;
  approval_date?: string;
  funded_date?: string;
  amount_requested: number;
  amount_approved?: number;
  status: 'pending' | 'approved' | 'funded' | 'rejected';
  notes?: string;
  created_at: string;
}

export interface LoanDrawAllocation {
  id: number;
  draw_id: number;
  budget_item_id: number;
  amount: number;
}

// Request Types
export interface CreateLoanRequest {
  project_id: number;
  lender_name: string;
  loan_number: string;
  total_amount: number;
  close_date?: string;
  maturity_date?: string;
  interest_rate?: number;
}

export interface UpdateLoanRequest {
  lender_name?: string;
  loan_number?: string;
  total_amount?: number;
  close_date?: string;
  maturity_date?: string;
  interest_rate?: number;
  status?: 'active' | 'closed' | 'defaulted';
}

export interface UpsertBudgetItemsRequest {
  items: {
    id?: number; // If present, update. If missing, create.
    category_name: string;
    original_budget: number;
    notes?: string;
    display_order?: number;
  }[];
}

export interface CreateDrawRequest {
  request_date: string;
  amount_requested: number;
  notes?: string;
  allocations: {
    budget_item_id: number;
    amount: number;
  }[];
}

export interface UpdateDrawStatusRequest {
  status: 'approved' | 'funded' | 'rejected';
  amount_approved?: number;
  approval_date?: string;
  funded_date?: string;
  notes?: string;
}




