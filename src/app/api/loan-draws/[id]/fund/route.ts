import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * PATCH /api/loan-draws/[id]/fund
 * Mark a draw as funded and update funding source
 */
export const PATCH = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;

    const { data: draw, error: fetchError } = await supabaseAdmin
      .from('loan_draws')
      .select('amount_approved, funding_source_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !draw) {
      throw new APIError('Draw not found', 404, 'NOT_FOUND');
    }

    if (draw.status !== 'approved') {
      throw new APIError('Can only fund approved draws', 400, 'INVALID_STATUS');
    }

    const { error: updateError } = await supabaseAdmin
      .from('loan_draws')
      .update({
        status: 'funded',
        funded_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      throw new APIError(updateError.message || 'Failed to update draw status', 500, 'DATABASE_ERROR');
    }

    const { error: rpcError } = await supabaseAdmin.rpc('increment_drawn_amount', {
      p_funding_source_id: draw.funding_source_id,
      p_amount: draw.amount_approved,
    });

    if (rpcError) {
      console.error('[Loan Draws API] RPC error:', rpcError);
      throw new APIError('Failed to update funding source', 500, 'RPC_ERROR');
    }

    console.log(`[Loan Draws API] Funded draw ${id}, updated funding source ${draw.funding_source_id}`);
    return successResponse({ message: 'Draw funded successfully' });
  } catch (error) {
    console.error('[Loan Draws API] Fund error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fund draw', 500, 'INTERNAL_ERROR');
  }
});
