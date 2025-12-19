import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * POST /api/draws/[id]/fund
 * Transition draw from approved to funded
 */
export const POST = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;

    // 1. Fetch draw
    const { data: draw, error: drawError } = await supabaseAdmin
      .from('construction_draws')
      .select('status')
      .eq('id', id)
      .single();

    if (drawError || !draw) {
      throw new APIError('Draw not found', 404, 'NOT_FOUND');
    }

    if (draw.status !== 'approved') {
      throw new APIError(`Cannot fund draw in '${draw.status}' status. Must be 'approved'.`, 400, 'VALIDATION_ERROR');
    }

    // 2. Update status
    const { data: updatedDraw, error: updateError } = await supabaseAdmin
      .from('construction_draws')
      .update({
        status: 'funded',
        funded_at: new Date().toISOString(),
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
    return errorResponse('Failed to fund draw', 500, 'INTERNAL_ERROR');
  }
});
