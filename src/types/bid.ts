export interface BidScopeItem {
  item: string;
  typically_included?: boolean;
  included?: boolean;
  add_cost?: number;
  notes?: string;
}

export interface BidScopeTemplate {
  id: number;
  trade: string;
  scope_type: string;
  name: string;
  description?: string;
  scope_items: BidScopeItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BidRound {
  id: number;
  project_id?: number;
  portfolio_id?: number;
  name: string;
  trade: string;
  scope_type?: string;
  description?: string;
  scope_template_id?: number;
  scope_items: BidScopeItem[];
  deadline_date?: string;
  awarded_date?: string;
  status: 'draft' | 'active' | 'closed' | 'awarded' | 'cancelled';
  winning_bid_id?: number;
  created_by?: number;
  created_at: string;
  updated_at: string;

  // Relations (populated from API joins)
  project?: {
    id: number;
    name: string;
  };
  portfolio?: {
    id: string;
    name: string;
  };
  scope_template?: {
    id: number;
    name: string;
    trade: string;
    scope_type: string;
    scope_items: BidScopeItem[];
  };
  winning_bid?: {
    id: number;
    contractor_id: number;
    amount: number;
    contractor?: {
      name: string;
    };
  };
  bids?: Bid[];
}

export interface Bid {
  id: number;
  bid_round_id?: number;
  contractor_id: number;
  project_id?: number;
  amount: number;
  submitted_at?: string;
  scope_coverage: BidScopeItem[];
  notes?: string;
  contractor_notes?: string;
  pm_notes?: string;
  source_type: 'manual' | 'photo' | 'pdf' | 'voice' | 'sms';
  source_url?: string;
  status: 'draft' | 'submitted' | 'won' | 'lost' | 'declined' | 'withdrawn';
  decline_reason?: 'too_busy' | 'timeline' | 'not_my_work' | 'too_small' | 'too_large' | 'too_far' | 'other';
  decline_notes?: string;
  actual_cost?: number;
  change_orders_total?: number;
  variance_percent?: number;
  created_by?: number;
  created_at: string;
  updated_at: string;

  // Relations
  contractor?: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    trade?: string;
  };
  project?: {
    id: number;
    name: string;
  };
  bid_round?: {
    id: number;
    name: string;
  };
}

export interface BidClarification {
  id: number;
  bid_id: number;
  question: string;
  response?: string;
  scope_items: BidScopeItem[];
  asked_by?: number;
  asked_at: string;
  responded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBidDTO {
  contractor_id: number;
  amount: number;
  project_id?: number;
  bid_round_id?: number;
  notes?: string;
  source_type?: 'manual' | 'photo' | 'pdf' | 'voice';
  source_url?: string;
  scope_coverage?: BidScopeItem[];
}

export interface UpdateBidDTO {
  amount?: number;
  notes?: string;
  pm_notes?: string;
  status?: 'draft' | 'submitted' | 'won' | 'lost' | 'declined' | 'withdrawn';
  scope_coverage?: BidScopeItem[];
  actual_cost?: number;
  change_orders_total?: number;
}

export interface CreateBidRoundDTO {
  project_id?: number;
  portfolio_id?: string;
  name: string;
  trade: string;
  scope_type?: string;
  description?: string;
  scope_template_id?: number;
  scope_items?: BidScopeItem[];
  deadline_date?: string;
}

export interface UpdateBidRoundDTO {
  name?: string;
  trade?: string;
  scope_type?: string;
  description?: string;
  scope_items?: BidScopeItem[];
  deadline_date?: string;
  awarded_date?: string;
  status?: 'draft' | 'active' | 'closed' | 'awarded' | 'cancelled';
  winning_bid_id?: number;
}

export interface CreateScopeTemplateDTO {
  trade: string;
  scope_type: string;
  name: string;
  description?: string;
  scope_items: BidScopeItem[];
}

export interface UpdateScopeTemplateDTO {
  trade?: string;
  scope_type?: string;
  name?: string;
  description?: string;
  scope_items?: BidScopeItem[];
  is_active?: boolean;
}
