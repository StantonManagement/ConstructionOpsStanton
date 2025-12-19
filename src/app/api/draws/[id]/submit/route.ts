import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * POST /api/draws/[id]/submit
 * Transition draw from draft to submitted
 */
export const POST = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;

    // 1. Fetch draw and line items to validate
    const { data: draw, error: drawError } = await supabaseAdmin
      .from('construction_draws')
      .select('status')
      .eq('id', id)
      .single();

    if (drawError || !draw) {
      throw new APIError('Draw not found', 404, 'NOT_FOUND');
    }

    if (draw.status !== 'draft') {
      throw new APIError(`Cannot submit draw in '${draw.status}' status`, 400, 'VALIDATION_ERROR');
    }

    const { data: lineItems, error: itemsError } = await supabaseAdmin
      .from('draw_line_items')
      .select('amount, task_id')
      .eq('draw_id', id);

    if (itemsError) {
      throw new APIError('Failed to fetch line items', 500, 'DATABASE_ERROR');
    }

    if (!lineItems || lineItems.length === 0) {
      throw new APIError('Draw must have at least one line item', 400, 'VALIDATION_ERROR');
    }

    // 2. Calculate total
    const totalAmount = lineItems.reduce((sum, item) => sum + Number(item.amount), 0);

    // 3. Update draw status and amount
    const { data: updatedDraw, error: updateError } = await supabaseAdmin
      .from('construction_draws')
      .update({
        status: 'submitted',
        amount_requested: totalAmount,
        submitted_at: new Date().toISOString(),
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
    return errorResponse('Failed to submit draw', 500, 'INTERNAL_ERROR');
  }
});
