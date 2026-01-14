import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * PATCH /api/loan-draws/[id]/submit
 * Submit a draft draw for approval
 */
export const PATCH = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('loan_draws')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'draft');

    if (error) {
      console.error('[Loan Draws API] Submit error:', error);
      throw new APIError(error.message || 'Failed to submit draw', 500, 'DATABASE_ERROR');
    }

    return successResponse({ message: 'Draw submitted successfully' });
  } catch (error) {
    console.error('[Loan Draws API] Submit error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to submit draw', 500, 'INTERNAL_ERROR');
  }
});
