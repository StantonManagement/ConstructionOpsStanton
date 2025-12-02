/**
 * Budget Utilities
 * 
 * Centralized functions for calculating budget metrics.
 * SINGLE SOURCE OF TRUTH: All "spent" calculations should use approved payment applications.
 * 
 * Key fields:
 * - current_period_value: The amount for this period (used for spent calculations)
 * - current_payment: Same as current_period_value in most cases
 * 
 * We standardize on `current_period_value` for consistency.
 */

import { supabase } from '@/lib/supabaseClient';

export interface ApprovedPayment {
  project_id: number;
  contractor_id: number;
  current_period_value: number;
}

export interface ProjectSpentData {
  [projectId: number]: number;
}

export interface ContractorSpentData {
  [contractorId: number]: number;
}

/**
 * Fetches all approved payment applications and returns spent amounts by project
 * This is the SINGLE SOURCE OF TRUTH for "spent" calculations
 */
export async function fetchApprovedPaymentsByProject(): Promise<ProjectSpentData> {
  const { data: approvedPayments, error } = await supabase
    .from('payment_applications')
    .select('project_id, current_period_value')
    .eq('status', 'approved');

  if (error) {
    console.error('[budgetUtils] Error fetching approved payments:', error);
    return {};
  }

  return (approvedPayments || []).reduce((acc: ProjectSpentData, payment) => {
    const projectId = payment.project_id;
    if (!acc[projectId]) {
      acc[projectId] = 0;
    }
    acc[projectId] += Number(payment.current_period_value) || 0;
    return acc;
  }, {});
}

/**
 * Fetches approved payment amounts by contractor
 */
export async function fetchApprovedPaymentsByContractor(): Promise<ContractorSpentData> {
  const { data: approvedPayments, error } = await supabase
    .from('payment_applications')
    .select('contractor_id, current_period_value')
    .eq('status', 'approved');

  if (error) {
    console.error('[budgetUtils] Error fetching approved payments by contractor:', error);
    return {};
  }

  return (approvedPayments || []).reduce((acc: ContractorSpentData, payment) => {
    const contractorId = payment.contractor_id;
    if (!acc[contractorId]) {
      acc[contractorId] = 0;
    }
    acc[contractorId] += Number(payment.current_period_value) || 0;
    return acc;
  }, {});
}

/**
 * Fetches total spent for a single project from approved payments
 */
export async function fetchProjectSpent(projectId: number): Promise<number> {
  const { data: approvedPayments, error } = await supabase
    .from('payment_applications')
    .select('current_period_value')
    .eq('project_id', projectId)
    .eq('status', 'approved');

  if (error) {
    console.error(`[budgetUtils] Error fetching spent for project ${projectId}:`, error);
    return 0;
  }

  return (approvedPayments || []).reduce((sum, payment) => {
    return sum + (Number(payment.current_period_value) || 0);
  }, 0);
}

/**
 * Fetches total spent for a contractor from approved payments
 */
export async function fetchContractorSpent(contractorId: number): Promise<number> {
  const { data: approvedPayments, error } = await supabase
    .from('payment_applications')
    .select('current_period_value')
    .eq('contractor_id', contractorId)
    .eq('status', 'approved');

  if (error) {
    console.error(`[budgetUtils] Error fetching spent for contractor ${contractorId}:`, error);
    return 0;
  }

  return (approvedPayments || []).reduce((sum, payment) => {
    return sum + (Number(payment.current_period_value) || 0);
  }, 0);
}

/**
 * Calculate total spent across all projects from approved payments
 */
export async function fetchTotalSpent(): Promise<number> {
  const { data: approvedPayments, error } = await supabase
    .from('payment_applications')
    .select('current_period_value')
    .eq('status', 'approved');

  if (error) {
    console.error('[budgetUtils] Error fetching total spent:', error);
    return 0;
  }

  return (approvedPayments || []).reduce((sum, payment) => {
    return sum + (Number(payment.current_period_value) || 0);
  }, 0);
}







