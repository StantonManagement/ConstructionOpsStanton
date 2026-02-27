import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import {
  withAuth,
  successResponse,
  errorResponse,
  APIError
} from '@/lib/apiHelpers';

/**
 * GET /api/projects/[id]/contractors/[contractorId]/contract
 * Fetch the contract for a specific contractor on a specific project
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: { params: Promise<{ id: string; contractorId: string }> },
  user: unknown
) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const projectId = parseInt(params.id);
    const contractorId = parseInt(params.contractorId);

    if (isNaN(projectId)) {
      throw new APIError('Invalid project ID', 400, 'VALIDATION_ERROR');
    }

    if (isNaN(contractorId)) {
      throw new APIError('Invalid contractor ID', 400, 'VALIDATION_ERROR');
    }

    // Fetch contract from project_contractors table
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('project_contractors')
      .select('*')
      .eq('project_id', projectId)
      .eq('contractor_id', contractorId)
      .single();

    if (contractError || !contract) {
      console.error('[Contract API] Error fetching contract:', contractError);
      throw new APIError('Contract not found', 404, 'NOT_FOUND');
    }

    // Map contractor_id to subcontractor_id for compatibility with Contract interface
    const mappedContract = {
      ...contract,
      subcontractor_id: contract.contractor_id
    };

    return successResponse({ contract: mappedContract });
  } catch (error) {
    console.error('[Contract API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch contract', 500, 'INTERNAL_ERROR');
  }
});
