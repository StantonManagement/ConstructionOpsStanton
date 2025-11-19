// Warranty Tracking Types

export type WarrantyStatus = 'pending' | 'active' | 'expired' | 'claimed' | 'void';

export type ClaimStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'denied' | 'resolved' | 'withdrawn';

export type ClaimUrgency = 'low' | 'medium' | 'high' | 'emergency';

export interface WarrantyType {
  id: number;
  name: string;
  default_duration_months?: number;
  description?: string;
  created_at: string;
}

export interface Warranty {
  id: number;
  project_id: number;
  contractor_id?: number;
  unit_number?: string;
  warranty_type?: string;
  coverage_description: string;
  covered_items?: string;
  start_date: string;
  end_date: string;
  duration_months?: number;
  status: WarrantyStatus;
  warranty_document_url?: string;
  receipt_url?: string;
  terms_pdf_url?: string;
  exclusions?: string;
  claim_process?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Computed
  days_until_expiration?: number;
  
  // Joined data
  project_name?: string;
  contractor_name?: string;
  claim_count?: number;
}

export interface WarrantyClaim {
  id: number;
  warranty_id: number;
  punch_item_id?: number;
  claim_date: string;
  issue_description: string;
  claim_amount?: number;
  urgency: ClaimUrgency;
  status: ClaimStatus;
  submitted_to_contractor_date?: string;
  contractor_response?: string;
  resolution_date?: string;
  resolution_notes?: string;
  claim_approved?: boolean;
  amount_recovered?: number;
  evidence_photo_urls?: string[];
  filed_by?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  warranty?: Warranty;
  filer_name?: string;
}

export interface WarrantyReminder {
  id: number;
  warranty_id: number;
  reminder_date: string;
  days_before_expiration: number;
  sent_date?: string;
  recipient_emails?: string[];
  status: 'pending' | 'sent' | 'opened' | 'acknowledged';
  created_at: string;
}

export interface CreateWarrantyRequest {
  project_id: number;
  contractor_id?: number;
  unit_number?: string;
  warranty_type?: string;
  coverage_description: string;
  covered_items?: string;
  start_date: string;
  end_date?: string;
  duration_months?: number;
  warranty_document_url?: string;
  receipt_url?: string;
  exclusions?: string;
  claim_process?: string;
  notes?: string;
}

export interface UpdateWarrantyRequest {
  contractor_id?: number;
  unit_number?: string;
  warranty_type?: string;
  coverage_description?: string;
  covered_items?: string;
  start_date?: string;
  end_date?: string;
  duration_months?: number;
  warranty_document_url?: string;
  receipt_url?: string;
  exclusions?: string;
  claim_process?: string;
  notes?: string;
  status?: WarrantyStatus;
}

export interface CreateClaimRequest {
  warranty_id: number;
  punch_item_id?: number;
  issue_description: string;
  claim_amount?: number;
  urgency?: ClaimUrgency;
  evidence_photo_urls?: string[];
}

export interface WarrantyFilters {
  project_id?: number;
  contractor_id?: number;
  status?: WarrantyStatus;
  expiring_days?: number;
  search?: string;
}

export interface ExpiringWarrantySummary {
  total_active: number;
  expiring_30_days: number;
  expiring_60_days: number;
  expiring_90_days: number;
  expired_recently: number;
}

