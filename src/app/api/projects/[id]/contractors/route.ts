import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import {
  withAuth,
  successResponse,
  errorResponse,
  APIError
} from '@/lib/apiHelpers';

/**
 * GET /api/projects/[id]/contractors
 * Fetch all contractors for a specific project (basic info without payment status)
 * For contractors with payment status, use /api/projects/[id]/contractors/with-payments
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
  user: unknown
) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const projectId = parseInt(params.id);

    if (isNaN(projectId)) {
      throw new APIError('Invalid project ID', 400, 'VALIDATION_ERROR');
    }

    // Fetch contractors for this project
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
      console.error('[Contractors API] Error fetching contractors:', contractorsError);
      throw new APIError(contractorsError.message, 500, 'DB_ERROR');
    }

    // Fix data structure (handle array responses from joins)
    const fixedData = (contractors || []).map((contract) => ({
      ...contract,
      contractors: Array.isArray(contract.contractors)
        ? contract.contractors[0]
        : contract.contractors,
      property_budgets: Array.isArray(contract.property_budgets)
        ? contract.property_budgets[0]
        : contract.property_budgets,
    }));

    return successResponse({
      contractors: fixedData,
      count: fixedData.length
    });

  } catch (error) {
    console.error('[Contractors API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch contractors', 500, 'INTERNAL_ERROR');
  }
});
