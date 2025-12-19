import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * POST /api/draws/[id]/approve
 * Transition draw from submitted to approved
 */
export const POST = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;
    const body = await request.json();
    const { amount_approved } = body;

    // 1. Fetch draw
    const { data: draw, error: drawError } = await supabaseAdmin
      .from('construction_draws')
      .select('status, amount_requested')
      .eq('id', id)
      .single();

    if (drawError || !draw) {
      throw new APIError('Draw not found', 404, 'NOT_FOUND');
    }

    if (draw.status !== 'submitted') {
      throw new APIError(`Cannot approve draw in '${draw.status}' status. Must be 'submitted'.`, 400, 'VALIDATION_ERROR');
    }

    // 2. Update status
    const approvedAmount = amount_approved !== undefined ? amount_approved : draw.amount_requested;

    const { data: updatedDraw, error: updateError } = await supabaseAdmin
      .from('construction_draws')
      .update({
        status: 'approved',
        amount_approved: approvedAmount,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw new APIError(updateError.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(updatedDraw);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to approve draw', 500, 'INTERNAL_ERROR');
  }
});
