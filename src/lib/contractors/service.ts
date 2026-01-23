/**
 * Contractor Service Layer
 * Following Dependency Inversion Principle - this abstracts database operations
 * Following Single Responsibility - each method handles one specific database operation
 */

import { supabase } from '@/lib/supabaseClient';

export interface Contractor {
  id: number;
  name: string;
  trade: string;
  phone?: string;
  email?: string;
}

export interface BudgetLineItem {
  id: number;
  category_name: string;
  original_amount: number;
}

export interface Contract {
  id: number;
  contract_amount: number;
  original_contract_amount: number;
  paid_to_date: number;
  display_order: number;
  contract_status?: string;
  budget_item_id?: number | null;
}

export interface ContractWithContractor extends Contract {
  contractor_id: number;
  contractors: Contractor;
  line_items?: unknown[];
  property_budgets?: BudgetLineItem;
}

export class ContractorService {
  /**
   * Fetch all contractors for a specific project
   */
  static async fetchProjectContractors(projectId: number): Promise<ContractWithContractor[]> {
    try {
      const { data, error } = await supabase
        .from('project_contractors')
        .select(`
          id,
          project_id,
          contract_amount,
          original_contract_amount,
          paid_to_date,
          display_order,
          contract_status,
          contractor_id,
          budget_item_id,
          contractors (
            id,
            name,
            trade,
            phone,
            email
          ),
          property_budgets (
            id,
            category_name,
            original_amount
          )
        `)
        .eq('project_id', projectId)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Supabase error fetching contractors:', {
          error,
          projectId,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        // Return empty array instead of throwing to prevent UI crash
        return [];
      }

      // If no data, return empty array
      if (!data) {
        console.warn(`No contractors found for project ${projectId}`);
        return [];
      }

      // Fix data structure (handle array responses from joins)
      const fixedData = data.map((contract) => ({
        ...contract,
        contractors: Array.isArray(contract.contractors)
          ? contract.contractors[0]
          : contract.contractors,
        property_budgets: Array.isArray(contract.property_budgets)
          ? contract.property_budgets[0]
          : contract.property_budgets,
      })) as ContractWithContractor[];

      return fixedData;
    } catch (err) {
      console.error('Error in fetchProjectContractors:', err);
      // Return empty array instead of throwing to prevent UI crash
      return [];
    }
  }

  /**
   * Fetch contractors not yet assigned to a project
   */
  static async fetchAvailableContractors(
    projectId: number,
    existingContractorIds: number[]
  ): Promise<Contractor[]> {
    const { data, error } = await supabase
      .from('contractors')
      .select('id, name, trade, phone, email')
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch contractors: ${error.message}`);
    }

    // Filter out contractors already on this project
    const available = (data || []).filter(
      (c) => !existingContractorIds.includes(c.id)
    );

    return available;
  }

  /**
   * Fetch budget line items for a project
   */
  static async fetchBudgetItems(projectId: number): Promise<BudgetLineItem[]> {
    const { data, error } = await supabase
      .from('property_budgets')
      .select('id, category_name, original_amount')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('category_name');

    if (error) {
      throw new Error(`Failed to fetch budget items: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Add a contractor to a project
   * Creates records in BOTH contracts (legal) and project_contractors (tracking) tables
   */
  static async addContractorToProject(params: {
    projectId: number;
    contractorId: number;
    contractAmount: number;
    budgetItemId?: number | null;
    displayOrder: number;
    startDate?: string;
    endDate?: string;
  }): Promise<void> {
    // STEP 1: Create the legal contract record
    const { error: contractError } = await supabase
      .from('contracts')
      .insert({
        project_id: params.projectId,
        subcontractor_id: params.contractorId,
        contract_amount: params.contractAmount,
        original_contract_amount: params.contractAmount,
        start_date: params.startDate || new Date().toISOString().split('T')[0],
        end_date: params.endDate || null,
        display_order: params.displayOrder,
      });

    if (contractError) {
      throw new Error(`Failed to create contract: ${contractError.message}`);
    }

    // STEP 2: Create the project tracking record
    const { error: projectContractorError } = await supabase
      .from('project_contractors')
      .insert({
        project_id: params.projectId,
        contractor_id: params.contractorId,
        contract_amount: params.contractAmount,
        original_contract_amount: params.contractAmount,
        paid_to_date: 0,
        display_order: params.displayOrder,
        contract_status: 'active',
        budget_item_id: params.budgetItemId || null,
      })
      .select()
      .single();

    if (projectContractorError) {
      // Rollback: delete the contract we just created
      await supabase
        .from('contracts')
        .delete()
        .eq('project_id', params.projectId)
        .eq('subcontractor_id', params.contractorId);

      throw new Error(`Failed to add contractor: ${projectContractorError.message}`);
    }
  }

  /**
   * Remove a contractor from a project (with validation)
   * Deletes from BOTH contracts (legal) and project_contractors (tracking) tables
   */
  static async removeContractorFromProject(
    projectContractorId: number,
    projectId: number,
    contractorId: number
  ): Promise<void> {
    // Check for dependent payment applications
    const { data: paymentApps, error: checkError } = await supabase
      .from('payment_applications')
      .select('id, status')
      .eq('project_id', projectId)
      .eq('contractor_id', contractorId);

    if (checkError) {
      throw new Error(`Failed to check dependencies: ${checkError.message}`);
    }

    // Check if there are any active payment applications
    const hasActivePayments =
      paymentApps &&
      paymentApps.some(
        (app) =>
          app.status === 'approved' ||
          app.status === 'submitted' ||
          app.status === 'pending'
      );

    if (hasActivePayments) {
      throw new Error(
        'Cannot delete contract with active or approved payment applications. Please archive or reject them first.'
      );
    }

    // Delete from project_contractors (tracking)
    const { error: pcError } = await supabase
      .from('project_contractors')
      .delete()
      .eq('id', projectContractorId);

    if (pcError) {
      throw new Error(`Failed to delete project contractor: ${pcError.message}`);
    }

    // Delete from contracts (legal) - find by project_id + contractor_id
    const { error: contractError } = await supabase
      .from('contracts')
      .delete()
      .eq('project_id', projectId)
      .eq('subcontractor_id', contractorId);

    if (contractError) {
      // Note: Don't throw error here as project_contractors is already deleted
      // Just log the error
      console.error('Failed to delete contract record:', contractError);
    }
  }

  /**
   * Update display order for a contract
   */
  static async updateDisplayOrder(
    contractId: number,
    displayOrder: number
  ): Promise<void> {
    const { error } = await supabase
      .from('project_contractors')
      .update({ display_order: displayOrder })
      .eq('id', contractId);

    if (error) {
      throw new Error(`Failed to update display order: ${error.message}`);
    }
  }

  /**
   * Batch update display orders for multiple contracts
   */
  static async updateDisplayOrders(
    updates: Array<{ id: number; display_order: number }>
  ): Promise<void> {
    for (const update of updates) {
      await this.updateDisplayOrder(update.id, update.display_order);
    }
  }
}
