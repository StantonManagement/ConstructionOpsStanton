export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      budget_category_loan_mapping: {
        Row: {
          allocation_percentage: number | null
          budget_category_id: number | null
          id: number
          loan_budget_item_id: number | null
        }
        Insert: {
          allocation_percentage?: number | null
          budget_category_id?: number | null
          id?: number
          loan_budget_item_id?: number | null
        }
        Update: {
          allocation_percentage?: number | null
          budget_category_id?: number | null
          id?: number
          loan_budget_item_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_category_loan_mapping_budget_category_id_fkey"
            columns: ["budget_category_id"]
            isOneToOne: false
            referencedRelation: "property_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_category_loan_mapping_budget_category_id_fkey"
            columns: ["budget_category_id"]
            isOneToOne: false
            referencedRelation: "property_budgets_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_category_loan_mapping_loan_budget_item_id_fkey"
            columns: ["loan_budget_item_id"]
            isOneToOne: false
            referencedRelation: "loan_budget_items"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_approvals: {
        Row: {
          action: string
          approver_id: string
          change_order_id: number
          comment: string | null
          created_at: string | null
          id: number
        }
        Insert: {
          action: string
          approver_id: string
          change_order_id: number
          comment?: string | null
          created_at?: string | null
          id?: number
        }
        Update: {
          action?: string
          approver_id?: string
          change_order_id?: number
          comment?: string | null
          created_at?: string | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "change_order_approvals_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_approvals_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders_detail"
            referencedColumns: ["id"]
          },
        ]
      }
      change_order_photos: {
        Row: {
          change_order_id: number
          created_at: string | null
          description: string | null
          display_order: number | null
          id: number
          photo_url: string
          uploaded_by: string | null
        }
        Insert: {
          change_order_id: number
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: number
          photo_url: string
          uploaded_by?: string | null
        }
        Update: {
          change_order_id?: number
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: number
          photo_url?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_order_photos_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_order_photos_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders_detail"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          approved_by: string | null
          approved_date: string | null
          budget_category_id: number | null
          co_number: string
          contractor_id: number | null
          cost_impact: number
          created_at: string | null
          created_by: string | null
          description: string
          id: number
          justification: string | null
          notes: string | null
          priority: string | null
          project_id: number
          reason_category: string
          schedule_impact_days: number | null
          status: string
          submitted_date: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          approved_date?: string | null
          budget_category_id?: number | null
          co_number: string
          contractor_id?: number | null
          cost_impact: number
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: number
          justification?: string | null
          notes?: string | null
          priority?: string | null
          project_id: number
          reason_category: string
          schedule_impact_days?: number | null
          status?: string
          submitted_date?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          approved_date?: string | null
          budget_category_id?: number | null
          co_number?: string
          contractor_id?: number | null
          cost_impact?: number
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: number
          justification?: string | null
          notes?: string | null
          priority?: string | null
          project_id?: number
          reason_category?: string
          schedule_impact_days?: number | null
          status?: string
          submitted_date?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_budget_category_id_fkey"
            columns: ["budget_category_id"]
            isOneToOne: false
            referencedRelation: "property_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_budget_category_id_fkey"
            columns: ["budget_category_id"]
            isOneToOne: false
            referencedRelation: "property_budgets_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders_legacy: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          contract_id: number
          created_at: string | null
          created_by: string | null
          description: string
          id: number
          percentage: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          contract_id: number
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: number
          percentage?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          contract_id?: number
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: number
          percentage?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string | null
          email: string | null
          id: number
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      construction_loans: {
        Row: {
          close_date: string | null
          created_at: string | null
          id: number
          interest_rate: number | null
          lender_name: string
          loan_number: string | null
          maturity_date: string | null
          project_id: number | null
          status: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          close_date?: string | null
          created_at?: string | null
          id?: number
          interest_rate?: number | null
          lender_name: string
          loan_number?: string | null
          maturity_date?: string | null
          project_id?: number | null
          status?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          close_date?: string | null
          created_at?: string | null
          id?: number
          interest_rate?: number | null
          lender_name?: string
          loan_number?: string | null
          maturity_date?: string | null
          project_id?: number | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_loans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_portal_tokens: {
        Row: {
          contractor_id: number
          created_at: string | null
          expires_at: string
          id: number
          token: string
        }
        Insert: {
          contractor_id: number
          created_at?: string | null
          expires_at: string
          id?: number
          token: string
        }
        Update: {
          contractor_id?: number
          created_at?: string | null
          expires_at?: string
          id?: number
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_portal_tokens_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          address: string | null
          city: string | null
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: number
          insurance_status: string | null
          license_status: string | null
          name: string
          performance_score: number | null
          phone: string
          state: string | null
          status: string | null
          trade: string
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          insurance_status?: string | null
          license_status?: string | null
          name: string
          performance_score?: number | null
          phone: string
          state?: string | null
          status?: string | null
          trade: string
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          insurance_status?: string | null
          license_status?: string | null
          name?: string
          performance_score?: number | null
          phone?: string
          state?: string | null
          status?: string | null
          trade?: string
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          contract_amount: number | null
          contract_nickname: string | null
          created_at: string | null
          display_order: number | null
          end_date: string | null
          id: number
          original_contract_amount: number | null
          project_id: number | null
          start_date: string | null
          subcontractor_id: number | null
        }
        Insert: {
          contract_amount?: number | null
          contract_nickname?: string | null
          created_at?: string | null
          display_order?: number | null
          end_date?: string | null
          id?: number
          original_contract_amount?: number | null
          project_id?: number | null
          start_date?: string | null
          subcontractor_id?: number | null
        }
        Update: {
          contract_amount?: number | null
          contract_nickname?: string | null
          created_at?: string | null
          display_order?: number | null
          end_date?: string | null
          id?: number
          original_contract_amount?: number | null
          project_id?: number | null
          start_date?: string | null
          subcontractor_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_log_requests: {
        Row: {
          created_at: string | null
          first_request_sent_at: string | null
          id: number
          last_request_sent_at: string | null
          max_retries: number | null
          next_retry_at: string | null
          pm_phone_number: string
          project_id: number
          received_at: string | null
          received_notes: string | null
          request_date: string
          request_status: string | null
          request_time: string | null
          retry_count: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_request_sent_at?: string | null
          id?: number
          last_request_sent_at?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          pm_phone_number: string
          project_id: number
          received_at?: string | null
          received_notes?: string | null
          request_date?: string
          request_status?: string | null
          request_time?: string | null
          retry_count?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_request_sent_at?: string | null
          id?: number
          last_request_sent_at?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          pm_phone_number?: string
          project_id?: number
          received_at?: string | null
          received_notes?: string | null
          request_date?: string
          request_status?: string | null
          request_time?: string | null
          retry_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_log_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_credentials: {
        Row: {
          access_token: string | null
          config: Json
          created_at: string | null
          expires_at: string | null
          id: number
          integration_name: string
          is_active: boolean | null
          refresh_token: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          config?: Json
          created_at?: string | null
          expires_at?: string | null
          id?: number
          integration_name: string
          is_active?: boolean | null
          refresh_token?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          config?: Json
          created_at?: string | null
          expires_at?: string | null
          id?: number
          integration_name?: string
          is_active?: boolean | null
          refresh_token?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lien_waivers: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: number
          payment_app_id: number | null
          signature_request_id: string | null
          signed_by: string | null
          signed_date: string | null
          status: string | null
          waiver_amount: number
          waiver_document_url: string | null
          waiver_type: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: number
          payment_app_id?: number | null
          signature_request_id?: string | null
          signed_by?: string | null
          signed_date?: string | null
          status?: string | null
          waiver_amount: number
          waiver_document_url?: string | null
          waiver_type?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: number
          payment_app_id?: number | null
          signature_request_id?: string | null
          signed_by?: string | null
          signed_date?: string | null
          status?: string | null
          waiver_amount?: number
          waiver_document_url?: string | null
          waiver_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lien_waivers_payment_app_id_fkey"
            columns: ["payment_app_id"]
            isOneToOne: false
            referencedRelation: "payment_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_budget_items: {
        Row: {
          approved_change_orders: number | null
          category_name: string
          created_at: string | null
          display_order: number | null
          id: number
          loan_id: number | null
          locked_at: string | null
          locked_by: string | null
          notes: string | null
          original_budget: number
          updated_at: string | null
        }
        Insert: {
          approved_change_orders?: number | null
          category_name: string
          created_at?: string | null
          display_order?: number | null
          id?: number
          loan_id?: number | null
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          original_budget?: number
          updated_at?: string | null
        }
        Update: {
          approved_change_orders?: number | null
          category_name?: string
          created_at?: string | null
          display_order?: number | null
          id?: number
          loan_id?: number | null
          locked_at?: string | null
          locked_by?: string | null
          notes?: string | null
          original_budget?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_budget_items_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "construction_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_draw_allocations: {
        Row: {
          amount: number
          budget_item_id: number | null
          draw_id: number | null
          id: number
        }
        Insert: {
          amount?: number
          budget_item_id?: number | null
          draw_id?: number | null
          id?: number
        }
        Update: {
          amount?: number
          budget_item_id?: number | null
          draw_id?: number | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "loan_draw_allocations_budget_item_id_fkey"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "loan_budget_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_draw_allocations_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "loan_draws"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_draws: {
        Row: {
          amount_approved: number | null
          amount_requested: number
          approval_date: string | null
          created_at: string | null
          draw_number: number
          funded_date: string | null
          id: number
          loan_id: number | null
          notes: string | null
          request_date: string
          status: string | null
        }
        Insert: {
          amount_approved?: number | null
          amount_requested?: number
          approval_date?: string | null
          created_at?: string | null
          draw_number: number
          funded_date?: string | null
          id?: number
          loan_id?: number | null
          notes?: string | null
          request_date: string
          status?: string | null
        }
        Update: {
          amount_approved?: number | null
          amount_requested?: number
          approval_date?: string | null
          created_at?: string | null
          draw_number?: number
          funded_date?: string | null
          id?: number
          loan_id?: number | null
          notes?: string | null
          request_date?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_draws_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "construction_loans"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          data: Json | null
          expires_at: string | null
          id: number
          message: string
          priority: string | null
          read_at: string | null
          source_id: number | null
          source_table: string | null
          title: string
          type: string
          user_id: number | null
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: number
          message: string
          priority?: string | null
          read_at?: string | null
          source_id?: number | null
          source_table?: string | null
          title: string
          type: string
          user_id?: number | null
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: number
          message?: string
          priority?: string | null
          read_at?: string | null
          source_id?: number | null
          source_table?: string | null
          title?: string
          type?: string
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_entities: {
        Row: {
          accounting_ref: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          entity_type: string
          id: number
          is_active: boolean | null
          name: string
          notes: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          accounting_ref?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          entity_type?: string
          id?: number
          is_active?: boolean | null
          name: string
          notes?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          accounting_ref?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          entity_type?: string
          id?: number
          is_active?: boolean | null
          name?: string
          notes?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_application_reviews: {
        Row: {
          adjusted_amount: number | null
          adjustment_reason: string | null
          created_at: string | null
          id: number
          original_amount: number | null
          payment_app_id: number | null
          photos_verified: boolean | null
          pm_notes: string | null
          review_action: string
          reviewer_id: number | null
        }
        Insert: {
          adjusted_amount?: number | null
          adjustment_reason?: string | null
          created_at?: string | null
          id?: number
          original_amount?: number | null
          payment_app_id?: number | null
          photos_verified?: boolean | null
          pm_notes?: string | null
          review_action: string
          reviewer_id?: number | null
        }
        Update: {
          adjusted_amount?: number | null
          adjustment_reason?: string | null
          created_at?: string | null
          id?: number
          original_amount?: number | null
          payment_app_id?: number | null
          photos_verified?: boolean | null
          pm_notes?: string | null
          review_action?: string
          reviewer_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_application_reviews_payment_app_id_fkey"
            columns: ["payment_app_id"]
            isOneToOne: false
            referencedRelation: "payment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_application_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_applications: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: number | null
          contractor_id: number | null
          created_at: string | null
          current_payment: number | null
          current_period_value: number | null
          due_date: string | null
          final_amount: number | null
          id: number
          lien_waiver_required: boolean | null
          payment_period_end: string | null
          photos_uploaded_count: number | null
          pm_notes: string | null
          pm_verification_completed: boolean | null
          previous_payments: number | null
          project_id: number | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_notes: string | null
          sms_conversation_id: number | null
          status: string | null
          total_contract_amount: number | null
          updated_at: string | null
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: number | null
          contractor_id?: number | null
          created_at?: string | null
          current_payment?: number | null
          current_period_value?: number | null
          due_date?: string | null
          final_amount?: number | null
          id?: number
          lien_waiver_required?: boolean | null
          payment_period_end?: string | null
          photos_uploaded_count?: number | null
          pm_notes?: string | null
          pm_verification_completed?: boolean | null
          previous_payments?: number | null
          project_id?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_notes?: string | null
          sms_conversation_id?: number | null
          status?: string | null
          total_contract_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: number | null
          contractor_id?: number | null
          created_at?: string | null
          current_payment?: number | null
          current_period_value?: number | null
          due_date?: string | null
          final_amount?: number | null
          id?: number
          lien_waiver_required?: boolean | null
          payment_period_end?: string | null
          photos_uploaded_count?: number | null
          pm_notes?: string | null
          pm_verification_completed?: boolean | null
          previous_payments?: number | null
          project_id?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_notes?: string | null
          sms_conversation_id?: number | null
          status?: string | null
          total_contract_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_applications_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_documents: {
        Row: {
          created_at: string | null
          docusign_envelope_id: string | null
          id: number
          payment_app_id: number | null
          signed_url: string | null
          status: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          docusign_envelope_id?: string | null
          id?: number
          payment_app_id?: number | null
          signed_url?: string | null
          status?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          docusign_envelope_id?: string | null
          id?: number
          payment_app_id?: number | null
          signed_url?: string | null
          status?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_documents_payment_app_id_fkey"
            columns: ["payment_app_id"]
            isOneToOne: false
            referencedRelation: "payment_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_line_item_progress: {
        Row: {
          calculated_amount: number | null
          created_at: string | null
          id: number
          line_item_id: number | null
          payment_app_id: number | null
          pm_adjustment_reason: string | null
          pm_verified_percent: number | null
          previous_percent: number | null
          submitted_percent: number | null
          this_period_percent: number | null
          updated_at: string | null
          verification_photos_count: number | null
        }
        Insert: {
          calculated_amount?: number | null
          created_at?: string | null
          id?: number
          line_item_id?: number | null
          payment_app_id?: number | null
          pm_adjustment_reason?: string | null
          pm_verified_percent?: number | null
          previous_percent?: number | null
          submitted_percent?: number | null
          this_period_percent?: number | null
          updated_at?: string | null
          verification_photos_count?: number | null
        }
        Update: {
          calculated_amount?: number | null
          created_at?: string | null
          id?: number
          line_item_id?: number | null
          payment_app_id?: number | null
          pm_adjustment_reason?: string | null
          pm_verified_percent?: number | null
          previous_percent?: number | null
          submitted_percent?: number | null
          this_period_percent?: number | null
          updated_at?: string | null
          verification_photos_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_line_item_progress_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "project_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_line_item_progress_payment_app_id_fkey"
            columns: ["payment_app_id"]
            isOneToOne: false
            referencedRelation: "payment_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: number
          message: string
          payment_app_id: number
          reminder_type: string
          sent_at: string | null
          sent_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: number
          message: string
          payment_app_id: number
          reminder_type: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: number
          message?: string
          payment_app_id?: number
          reminder_type?: string
          sent_at?: string | null
          sent_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_payment_app_id_fkey"
            columns: ["payment_app_id"]
            isOneToOne: false
            referencedRelation: "payment_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_sms_conversations: {
        Row: {
          completed_at: string | null
          contractor_id: number | null
          contractor_phone: string
          conversation_state: string | null
          created_at: string | null
          current_question_index: number | null
          escalated_at: string | null
          escalated_to_dean: boolean | null
          id: number
          line_items: Json | null
          payment_app_id: number | null
          project_id: number | null
          responses: Json | null
          timeout_count: number | null
          total_questions: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          contractor_id?: number | null
          contractor_phone: string
          conversation_state?: string | null
          created_at?: string | null
          current_question_index?: number | null
          escalated_at?: string | null
          escalated_to_dean?: boolean | null
          id?: number
          line_items?: Json | null
          payment_app_id?: number | null
          project_id?: number | null
          responses?: Json | null
          timeout_count?: number | null
          total_questions?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          contractor_id?: number | null
          contractor_phone?: string
          conversation_state?: string | null
          created_at?: string | null
          current_question_index?: number | null
          escalated_at?: string | null
          escalated_to_dean?: boolean | null
          id?: number
          line_items?: Json | null
          payment_app_id?: number | null
          project_id?: number | null
          responses?: Json | null
          timeout_count?: number | null
          total_questions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_sms_conversations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_sms_conversations_payment_app_id_fkey"
            columns: ["payment_app_id"]
            isOneToOne: false
            referencedRelation: "payment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_sms_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          permission_category: string
          permission_key: string
          permission_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          permission_category: string
          permission_key: string
          permission_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          permission_category?: string
          permission_key?: string
          permission_name?: string
        }
        Relationships: []
      }
      photo_annotations: {
        Row: {
          annotation_text: string | null
          annotation_type: string
          color: string | null
          created_at: string | null
          created_by: string | null
          height: number | null
          id: number
          photo_id: number
          width: number | null
          x_coord: number | null
          y_coord: number | null
        }
        Insert: {
          annotation_text?: string | null
          annotation_type: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          height?: number | null
          id?: number
          photo_id: number
          width?: number | null
          x_coord?: number | null
          y_coord?: number | null
        }
        Update: {
          annotation_text?: string | null
          annotation_type?: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          height?: number | null
          id?: number
          photo_id?: number
          width?: number | null
          x_coord?: number | null
          y_coord?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_annotations_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_collections: {
        Row: {
          collection_name: string
          collection_type: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: number
          photo_ids: number[]
          project_id: number
          updated_at: string | null
        }
        Insert: {
          collection_name: string
          collection_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: number
          photo_ids: number[]
          project_id: number
          updated_at?: string | null
        }
        Update: {
          collection_name?: string
          collection_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: number
          photo_ids?: number[]
          project_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_collections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string | null
          device_info: Json | null
          file_size: number | null
          gps_latitude: number | null
          gps_longitude: number | null
          height: number | null
          id: number
          location_description: string | null
          payment_app_id: number | null
          photo_type: string | null
          photo_url: string
          project_id: number
          punch_item_id: number | null
          tags: string[] | null
          thumbnail_url: string | null
          timestamp: string | null
          updated_at: string | null
          uploaded_by: string | null
          visibility: string | null
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          device_info?: Json | null
          file_size?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          height?: number | null
          id?: number
          location_description?: string | null
          payment_app_id?: number | null
          photo_type?: string | null
          photo_url: string
          project_id: number
          punch_item_id?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          timestamp?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          visibility?: string | null
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          device_info?: Json | null
          file_size?: number | null
          gps_latitude?: number | null
          gps_longitude?: number | null
          height?: number | null
          id?: number
          location_description?: string | null
          payment_app_id?: number | null
          photo_type?: string | null
          photo_url?: string
          project_id?: number
          punch_item_id?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          timestamp?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          visibility?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_payment_app_id_fkey"
            columns: ["payment_app_id"]
            isOneToOne: false
            referencedRelation: "payment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_punch_item_id_fkey"
            columns: ["punch_item_id"]
            isOneToOne: false
            referencedRelation: "punch_list_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pm_notes: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean | null
          is_daily: boolean | null
          last_sent_at: string | null
          note: string
          project_id: number | null
          scheduled_time: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          is_daily?: boolean | null
          last_sent_at?: string | null
          note: string
          project_id?: number | null
          scheduled_time?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          is_daily?: boolean | null
          last_sent_at?: string | null
          note?: string
          project_id?: number | null
          scheduled_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_contractors: {
        Row: {
          budget_item_id: number | null
          change_orders_pending: boolean | null
          contract_amount: number
          contract_status: string | null
          contractor_id: number | null
          display_order: number | null
          id: number
          last_payment_date: string | null
          original_contract_amount: number | null
          paid_to_date: number | null
          project_id: number | null
          updated_at: string | null
        }
        Insert: {
          budget_item_id?: number | null
          change_orders_pending?: boolean | null
          contract_amount: number
          contract_status?: string | null
          contractor_id?: number | null
          display_order?: number | null
          id?: number
          last_payment_date?: string | null
          original_contract_amount?: number | null
          paid_to_date?: number | null
          project_id?: number | null
          updated_at?: string | null
        }
        Update: {
          budget_item_id?: number | null
          change_orders_pending?: boolean | null
          contract_amount?: number
          contract_status?: string | null
          contractor_id?: number | null
          display_order?: number | null
          id?: number
          last_payment_date?: string | null
          original_contract_amount?: number | null
          paid_to_date?: number | null
          project_id?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_contractors_budget_item_id_fkey"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "property_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contractors_budget_item_id_fkey"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "property_budgets_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contractors_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_contractors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_line_items: {
        Row: {
          amount_for_this_period: number | null
          change_order_amount: number | null
          contract_id: number | null
          contractor_id: number | null
          created_at: string | null
          description_of_work: string | null
          display_order: number | null
          from_previous_application: number | null
          id: number
          item_no: string | null
          material_presently_stored: number | null
          original_contract_amount: number | null
          percent_completed: number | null
          percent_gc: number | null
          project_id: number | null
          scheduled_value: number | null
          status: string | null
          this_period: number | null
          updated_at: string | null
        }
        Insert: {
          amount_for_this_period?: number | null
          change_order_amount?: number | null
          contract_id?: number | null
          contractor_id?: number | null
          created_at?: string | null
          description_of_work?: string | null
          display_order?: number | null
          from_previous_application?: number | null
          id?: number
          item_no?: string | null
          material_presently_stored?: number | null
          original_contract_amount?: number | null
          percent_completed?: number | null
          percent_gc?: number | null
          project_id?: number | null
          scheduled_value?: number | null
          status?: string | null
          this_period?: number | null
          updated_at?: string | null
        }
        Update: {
          amount_for_this_period?: number | null
          change_order_amount?: number | null
          contract_id?: number | null
          contractor_id?: number | null
          created_at?: string | null
          description_of_work?: string | null
          display_order?: number | null
          from_previous_application?: number | null
          id?: number
          item_no?: string | null
          material_presently_stored?: number | null
          original_contract_amount?: number | null
          percent_completed?: number | null
          percent_gc?: number | null
          project_id?: number | null
          scheduled_value?: number | null
          status?: string | null
          this_period?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_line_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_line_items_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_line_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_schedules: {
        Row: {
          actual_end_date: string | null
          created_at: string | null
          created_by: string | null
          id: string
          project_id: number
          start_date: string
          status: string | null
          target_end_date: string
          updated_at: string | null
        }
        Insert: {
          actual_end_date?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          project_id: number
          start_date: string
          status?: string | null
          target_end_date: string
          updated_at?: string | null
        }
        Update: {
          actual_end_date?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          project_id?: number
          start_date?: string
          status?: string | null
          target_end_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          at_risk: boolean | null
          budget: number | null
          client_name: string
          created_at: string | null
          current_phase: string | null
          id: number
          name: string
          owner_entity_id: number | null
          portfolio_name: string | null
          project_code: string
          spent: number | null
          start_date: string | null
          starting_balance: number | null
          status: string | null
          target_completion_date: string | null
          total_units: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          at_risk?: boolean | null
          budget?: number | null
          client_name: string
          created_at?: string | null
          current_phase?: string | null
          id?: number
          name: string
          owner_entity_id?: number | null
          portfolio_name?: string | null
          project_code?: string
          spent?: number | null
          start_date?: string | null
          starting_balance?: number | null
          status?: string | null
          target_completion_date?: string | null
          total_units?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          at_risk?: boolean | null
          budget?: number | null
          client_name?: string
          created_at?: string | null
          current_phase?: string | null
          id?: number
          name?: string
          owner_entity_id?: number | null
          portfolio_name?: string | null
          project_code?: string
          spent?: number | null
          start_date?: string | null
          starting_balance?: number | null
          status?: string | null
          target_completion_date?: string | null
          total_units?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_projects_owner_entity"
            columns: ["owner_entity_id"]
            isOneToOne: false
            referencedRelation: "owner_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      property_budgets: {
        Row: {
          actual_spend: number
          category_name: string
          committed_costs: number
          created_at: string | null
          description: string | null
          display_order: number | null
          id: number
          is_active: boolean | null
          notes: string | null
          original_amount: number
          project_id: number
          revised_amount: number
          updated_at: string | null
        }
        Insert: {
          actual_spend?: number
          category_name: string
          committed_costs?: number
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: number
          is_active?: boolean | null
          notes?: string | null
          original_amount?: number
          project_id: number
          revised_amount?: number
          updated_at?: string | null
        }
        Update: {
          actual_spend?: number
          category_name?: string
          committed_costs?: number
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: number
          is_active?: boolean | null
          notes?: string | null
          original_amount?: number
          project_id?: number
          revised_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_list_categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: number
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: number
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      punch_list_comments: {
        Row: {
          attachment_url: string | null
          author_id: string
          comment_text: string
          created_at: string | null
          id: number
          punch_item_id: number
          updated_at: string | null
        }
        Insert: {
          attachment_url?: string | null
          author_id: string
          comment_text: string
          created_at?: string | null
          id?: number
          punch_item_id: number
          updated_at?: string | null
        }
        Update: {
          attachment_url?: string | null
          author_id?: string
          comment_text?: string
          created_at?: string | null
          id?: number
          punch_item_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "punch_list_comments_punch_item_id_fkey"
            columns: ["punch_item_id"]
            isOneToOne: false
            referencedRelation: "punch_list_items"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_list_items: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: number | null
          completed_at: string | null
          completed_by: string | null
          completed_date: string | null
          contractor_id: number | null
          contractor_notes: string | null
          created_at: string | null
          created_by: string | null
          description: string
          due_date: string | null
          gc_notes: string | null
          id: number
          item_number: string
          location: string | null
          location_area: string | null
          notes: string | null
          priority: string | null
          project_id: number
          severity: string
          started_at: string | null
          status: string
          trade_category: string | null
          unit_number: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
          verified_date: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: number | null
          completed_at?: string | null
          completed_by?: string | null
          completed_date?: string | null
          contractor_id?: number | null
          contractor_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          due_date?: string | null
          gc_notes?: string | null
          id?: number
          item_number: string
          location?: string | null
          location_area?: string | null
          notes?: string | null
          priority?: string | null
          project_id: number
          severity?: string
          started_at?: string | null
          status?: string
          trade_category?: string | null
          unit_number?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          verified_date?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: number | null
          completed_at?: string | null
          completed_by?: string | null
          completed_date?: string | null
          contractor_id?: number | null
          contractor_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          due_date?: string | null
          gc_notes?: string | null
          id?: number
          item_number?: string
          location?: string | null
          location_area?: string | null
          notes?: string | null
          priority?: string | null
          project_id?: number
          severity?: string
          started_at?: string | null
          status?: string
          trade_category?: string | null
          unit_number?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
          verified_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "punch_list_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_list_items_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_list_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_list_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          id: number
          photo_url: string
          punch_list_item_id: number
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: number
          photo_url: string
          punch_list_item_id: number
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: number
          photo_url?: string
          punch_list_item_id?: number
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "punch_list_photos_punch_list_item_id_fkey"
            columns: ["punch_list_item_id"]
            isOneToOne: false
            referencedRelation: "punch_list_items"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: number
          permission_id: number
          role: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: number
          permission_id: number
          role: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: number
          permission_id?: number
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_dependencies: {
        Row: {
          created_at: string | null
          dependency_type: string | null
          id: string
          lag_days: number | null
          source_task_id: string
          target_task_id: string
        }
        Insert: {
          created_at?: string | null
          dependency_type?: string | null
          id?: string
          lag_days?: number | null
          source_task_id: string
          target_task_id: string
        }
        Update: {
          created_at?: string | null
          dependency_type?: string | null
          id?: string
          lag_days?: number | null
          source_task_id?: string
          target_task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_dependencies_source_task_id_fkey"
            columns: ["source_task_id"]
            isOneToOne: false
            referencedRelation: "schedule_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_dependencies_target_task_id_fkey"
            columns: ["target_task_id"]
            isOneToOne: false
            referencedRelation: "schedule_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_milestones: {
        Row: {
          actual_date: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          schedule_id: string
          status: string | null
          target_date: string
        }
        Insert: {
          actual_date?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          schedule_id: string
          status?: string | null
          target_date: string
        }
        Update: {
          actual_date?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          schedule_id?: string
          status?: string | null
          target_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_milestones_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "project_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_tasks: {
        Row: {
          budget_category_id: number | null
          contractor_id: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          duration_days: number | null
          end_date: string
          id: string
          is_milestone: boolean | null
          parent_task_id: string | null
          progress: number | null
          schedule_id: string
          sort_order: number | null
          start_date: string
          status: string | null
          task_name: string
          updated_at: string | null
        }
        Insert: {
          budget_category_id?: number | null
          contractor_id?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_days?: number | null
          end_date: string
          id?: string
          is_milestone?: boolean | null
          parent_task_id?: string | null
          progress?: number | null
          schedule_id: string
          sort_order?: number | null
          start_date: string
          status?: string | null
          task_name: string
          updated_at?: string | null
        }
        Update: {
          budget_category_id?: number | null
          contractor_id?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          duration_days?: number | null
          end_date?: string
          id?: string
          is_milestone?: boolean | null
          parent_task_id?: string | null
          progress?: number | null
          schedule_id?: string
          sort_order?: number | null
          start_date?: string
          status?: string | null
          task_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_tasks_budget_category_id_fkey"
            columns: ["budget_category_id"]
            isOneToOne: false
            referencedRelation: "property_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_tasks_budget_category_id_fkey"
            columns: ["budget_category_id"]
            isOneToOne: false
            referencedRelation: "property_budgets_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_tasks_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "schedule_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_tasks_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "project_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      site_verification_photos: {
        Row: {
          created_at: string | null
          file_size: number | null
          id: number
          line_item_id: number | null
          mime_type: string | null
          payment_app_id: number | null
          photo_caption: string | null
          photo_sequence: number | null
          photo_url: string
          taken_at: string | null
          taken_by: number | null
        }
        Insert: {
          created_at?: string | null
          file_size?: number | null
          id?: number
          line_item_id?: number | null
          mime_type?: string | null
          payment_app_id?: number | null
          photo_caption?: string | null
          photo_sequence?: number | null
          photo_url: string
          taken_at?: string | null
          taken_by?: number | null
        }
        Update: {
          created_at?: string | null
          file_size?: number | null
          id?: number
          line_item_id?: number | null
          mime_type?: string | null
          payment_app_id?: number | null
          photo_caption?: string | null
          photo_sequence?: number | null
          photo_url?: string
          taken_at?: string | null
          taken_by?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "site_verification_photos_line_item_id_fkey"
            columns: ["line_item_id"]
            isOneToOne: false
            referencedRelation: "project_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_verification_photos_payment_app_id_fkey"
            columns: ["payment_app_id"]
            isOneToOne: false
            referencedRelation: "payment_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_verification_photos_taken_by_fkey"
            columns: ["taken_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          dark_mode: boolean | null
          email_notifications: boolean | null
          id: number
          sms_notifications: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dark_mode?: boolean | null
          email_notifications?: boolean | null
          id?: number
          sms_notifications?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dark_mode?: boolean | null
          email_notifications?: boolean | null
          id?: number
          sms_notifications?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_role: {
        Row: {
          created_at: string
          id: number
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: number
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          address: string | null
          avatar_url: string | null
          company: string | null
          created_at: string | null
          email: string
          id: number
          is_active: boolean | null
          name: string | null
          phone: string | null
          role: string
          uuid: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          id?: number
          is_active?: boolean | null
          name?: string | null
          phone?: string | null
          role: string
          uuid?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          id?: number
          is_active?: boolean | null
          name?: string | null
          phone?: string | null
          role?: string
          uuid?: string | null
        }
        Relationships: []
      }
      warranties: {
        Row: {
          claim_process: string | null
          contractor_id: number | null
          coverage_description: string | null
          covered_items: string | null
          created_at: string | null
          created_by: string | null
          duration_months: number | null
          end_date: string
          exclusions: string | null
          id: number
          notes: string | null
          project_id: number
          reminder_30_days: boolean | null
          reminder_60_days: boolean | null
          reminder_90_days: boolean | null
          start_date: string
          status: string | null
          terms_pdf_url: string | null
          updated_at: string | null
          warranty_document_url: string | null
          warranty_type: string | null
        }
        Insert: {
          claim_process?: string | null
          contractor_id?: number | null
          coverage_description?: string | null
          covered_items?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_months?: number | null
          end_date: string
          exclusions?: string | null
          id?: number
          notes?: string | null
          project_id: number
          reminder_30_days?: boolean | null
          reminder_60_days?: boolean | null
          reminder_90_days?: boolean | null
          start_date: string
          status?: string | null
          terms_pdf_url?: string | null
          updated_at?: string | null
          warranty_document_url?: string | null
          warranty_type?: string | null
        }
        Update: {
          claim_process?: string | null
          contractor_id?: number | null
          coverage_description?: string | null
          covered_items?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_months?: number | null
          end_date?: string
          exclusions?: string | null
          id?: number
          notes?: string | null
          project_id?: number
          reminder_30_days?: boolean | null
          reminder_60_days?: boolean | null
          reminder_90_days?: boolean | null
          start_date?: string
          status?: string | null
          terms_pdf_url?: string | null
          updated_at?: string | null
          warranty_document_url?: string | null
          warranty_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranties_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_claims: {
        Row: {
          amount_recovered: number | null
          claim_amount: number | null
          claim_approved: boolean | null
          claim_date: string
          contractor_response: string | null
          created_at: string | null
          created_by: string | null
          evidence_photo_urls: string[] | null
          id: number
          issue_description: string
          punch_item_id: number | null
          resolution_date: string | null
          resolution_notes: string | null
          status: string | null
          submitted_to_contractor_date: string | null
          updated_at: string | null
          warranty_id: number
        }
        Insert: {
          amount_recovered?: number | null
          claim_amount?: number | null
          claim_approved?: boolean | null
          claim_date?: string
          contractor_response?: string | null
          created_at?: string | null
          created_by?: string | null
          evidence_photo_urls?: string[] | null
          id?: number
          issue_description: string
          punch_item_id?: number | null
          resolution_date?: string | null
          resolution_notes?: string | null
          status?: string | null
          submitted_to_contractor_date?: string | null
          updated_at?: string | null
          warranty_id: number
        }
        Update: {
          amount_recovered?: number | null
          claim_amount?: number | null
          claim_approved?: boolean | null
          claim_date?: string
          contractor_response?: string | null
          created_at?: string | null
          created_by?: string | null
          evidence_photo_urls?: string[] | null
          id?: number
          issue_description?: string
          punch_item_id?: number | null
          resolution_date?: string | null
          resolution_notes?: string | null
          status?: string | null
          submitted_to_contractor_date?: string | null
          updated_at?: string | null
          warranty_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_punch_item_id_fkey"
            columns: ["punch_item_id"]
            isOneToOne: false
            referencedRelation: "punch_list_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "expiring_warranties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_reminders: {
        Row: {
          created_at: string | null
          days_before_expiration: number
          id: number
          recipient_email: string | null
          reminder_date: string
          sent_date: string | null
          status: string | null
          warranty_id: number
        }
        Insert: {
          created_at?: string | null
          days_before_expiration: number
          id?: number
          recipient_email?: string | null
          reminder_date: string
          sent_date?: string | null
          status?: string | null
          warranty_id: number
        }
        Update: {
          created_at?: string | null
          days_before_expiration?: number
          id?: number
          recipient_email?: string | null
          reminder_date?: string
          sent_date?: string | null
          status?: string | null
          warranty_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "warranty_reminders_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "expiring_warranties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_reminders_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_types: {
        Row: {
          created_at: string | null
          default_duration_months: number | null
          description: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          default_duration_months?: number | null
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          default_duration_months?: number | null
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      change_orders_detail: {
        Row: {
          approval_count: number | null
          approved_by: string | null
          approved_date: string | null
          approver_email: string | null
          co_number: string | null
          contractor_id: number | null
          contractor_name: string | null
          contractor_trade: string | null
          cost_impact: number | null
          created_at: string | null
          created_by: string | null
          creator_email: string | null
          description: string | null
          id: number | null
          justification: string | null
          owner_entity_id: number | null
          owner_entity_name: string | null
          photo_count: number | null
          portfolio_name: string | null
          project_id: number | null
          project_name: string | null
          project_status: string | null
          rejection_count: number | null
          schedule_impact_days: number | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_projects_owner_entity"
            columns: ["owner_entity_id"]
            isOneToOne: false
            referencedRelation: "owner_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders_summary_by_project: {
        Row: {
          approved_count: number | null
          latest_change_order_date: string | null
          pending_count: number | null
          project_id: number | null
          rejected_count: number | null
          total_approved_cost: number | null
          total_change_orders: number | null
          total_pending_cost: number | null
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      expiring_warranties: {
        Row: {
          claim_process: string | null
          contractor_id: number | null
          contractor_name: string | null
          coverage_description: string | null
          covered_items: string | null
          created_at: string | null
          created_by: string | null
          days_until_expiration: number | null
          duration_months: number | null
          end_date: string | null
          exclusions: string | null
          id: number | null
          notes: string | null
          project_id: number | null
          project_name: string | null
          reminder_30_days: boolean | null
          reminder_60_days: boolean | null
          reminder_90_days: boolean | null
          start_date: string | null
          status: string | null
          terms_pdf_url: string | null
          updated_at: string | null
          warranty_document_url: string | null
          warranty_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranties_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      property_budgets_summary: {
        Row: {
          actual_spend: number | null
          budget_status: string | null
          budget_variance: number | null
          category_name: string | null
          committed_costs: number | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: number | null
          is_active: boolean | null
          notes: string | null
          original_amount: number | null
          owner_entity_id: number | null
          percent_spent: number | null
          portfolio_name: string | null
          project_id: number | null
          project_name: string | null
          remaining_amount: number | null
          revised_amount: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_projects_owner_entity"
            columns: ["owner_entity_id"]
            isOneToOne: false
            referencedRelation: "owner_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_list_summary: {
        Row: {
          completed_items: number | null
          critical_items: number | null
          high_severity_items: number | null
          in_progress_items: number | null
          open_items: number | null
          overdue_items: number | null
          project_id: number | null
          total_items: number | null
          verified_items: number | null
        }
        Relationships: [
          {
            foreignKeyName: "punch_list_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions_view: {
        Row: {
          description: string | null
          granted_at: string | null
          id: number | null
          permission_category: string | null
          permission_key: string | null
          permission_name: string | null
          role: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_budget_remaining: {
        Args: {
          p_actual_spend: number
          p_committed_costs: number
          p_revised_amount: number
        }
        Returns: number
      }
      calculate_percent_spent: {
        Args: { p_actual_spend: number; p_revised_amount: number }
        Returns: number
      }
      calculate_punch_due_date: {
        Args: { p_created_date: string; p_severity: string }
        Returns: string
      }
      check_database_health: {
        Args: never
        Returns: {
          check_name: string
          message: string
          severity: string
          status: string
        }[]
      }
      check_expiring_contracts: { Args: never; Returns: undefined }
      generate_co_number: { Args: { p_project_id: number }; Returns: string }
      generate_punch_item_number: {
        Args: { p_project_id: number }
        Returns: string
      }
      get_user_role: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_pm: { Args: never; Returns: boolean }
      user_has_permission: {
        Args: { permission_key_param: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
