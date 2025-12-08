import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  APIError 
} from '@/lib/apiHelpers';

interface ContractorWithPaymentStatus {
  id: number;
  project_id: number;
  contractor_id: number;
  contract_amount: number;
  original_contract_amount: number;
  paid_to_date: number;
  display_order: number;
  contract_status: string;
  budget_item_id: number | null;
  contractors: {
    id: number;
    name: string;
    trade: string;
    phone: string | null;
    email: string | null;
  };
  property_budgets: {
    id: number;
    category_name: string;
    original_amount: number;
  } | null;
  // Payment status
  approved_cos: number;
  co_total: number;
  approved_unpaid: number;
  pending_review: number;
  remaining: number;
  pending_payments: Array<{
    id: number;
    reference: string;
    amount: number;
    status: string;
    created_at: string;
  }>;
}

export const GET = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  if (!supabaseAdmin) {
    throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
  }

  const params = await context.params;
  const projectId = parseInt(params.id);

  if (isNaN(projectId)) {
    throw new APIError('Invalid project ID', 400, 'VALIDATION_ERROR');
  }

  // Fetch base contractor data
  const { data: contractors, error: contractorsError } = await supabaseAdmin
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

  if (contractorsError) {
    throw new APIError(contractorsError.message, 500, 'DB_ERROR');
  }

  // Enhance each contractor with payment status
  const enhancedContractors = await Promise.all((contractors || []).map(async (contract: any) => {
    const contractorId = contract.contractor_id;

    // Get approved change orders
    const { data: approvedCOs } = await supabaseAdmin
      .from('change_orders')
      .select('cost_impact')
      .eq('project_id', projectId)
      .eq('contractor_id', contractorId)
      .eq('status', 'approved');

    const approved_cos = approvedCOs?.length || 0;
    const co_total = approvedCOs?.reduce((sum: number, co: any) => sum + (Number(co.cost_impact) || 0), 0) || 0;

    // Get approved but unpaid payment applications
    const { data: approvedUnpaidPAs } = await supabaseAdmin
      .from('payment_applications')
      .select('current_payment')
      .eq('project_id', projectId)
      .eq('contractor_id', contractorId)
      .eq('status', 'approved');

    const approved_unpaid = approvedUnpaidPAs?.reduce((sum: number, pa: any) => sum + (Number(pa.current_payment) || 0), 0) || 0;

    // Get pending review payment applications
    const { data: pendingPAs } = await supabaseAdmin
      .from('payment_applications')
      .select('current_payment')
      .eq('project_id', projectId)
      .eq('contractor_id', contractorId)
      .in('status', ['submitted', 'needs_review']);

    const pending_review = pendingPAs?.reduce((sum: number, pa: any) => sum + (Number(pa.current_payment) || 0), 0) || 0;

    // Get recent pending payments for quick status
    const { data: recentPAs } = await supabaseAdmin
      .from('payment_applications')
      .select('id, current_payment, status, created_at')
      .eq('project_id', projectId)
      .eq('contractor_id', contractorId)
      .in('status', ['submitted', 'needs_review', 'approved'])
      .order('created_at', { ascending: false })
      .limit(3);

    const pending_payments = (recentPAs || []).map((pa: any) => ({
      id: pa.id,
      reference: `PA-${pa.id.toString().padStart(4, '0')}`,
      amount: Number(pa.current_payment) || 0,
      status: pa.status,
      created_at: pa.created_at
    }));

    // Calculate remaining
    const contractAmount = Number(contract.contract_amount) || 0;
    const paidToDate = Number(contract.paid_to_date) || 0;
    const remaining = contractAmount - paidToDate - approved_unpaid - pending_review;

    return {
      ...contract,
      contractors: Array.isArray(contract.contractors) ? contract.contractors[0] : contract.contractors,
      property_budgets: Array.isArray(contract.property_budgets) ? contract.property_budgets[0] : contract.property_budgets,
      approved_cos,
      co_total,
      approved_unpaid,
      pending_review,
      remaining,
      pending_payments
    };
  }));

  return successResponse(enhancedContractors);
})
