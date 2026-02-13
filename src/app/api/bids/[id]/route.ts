import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';
import { UpdateBidDTO } from '@/types/bid';

/**
 * GET /api/bids/[id]
 * Get a specific bid
 */
export const GET = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const { id } = params;

    const { data: bid, error } = await supabaseAdmin
      .from('bids')
      .select(`
        *,
        contractor:contractors(id, name, phone, email, trade),
        project:projects(id, name),
        bid_round:bid_rounds!bids_bid_round_id_fkey(id, name, trade, scope_items)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new APIError('Bid not found', 404, 'NOT_FOUND');
      }
      console.error('[Bid API] Query error:', error);
      throw new APIError(error.message || 'Failed to fetch bid', 500, 'DATABASE_ERROR');
    }

    return successResponse(bid);
  } catch (error) {
    console.error('[Bid API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch bid', 500, 'INTERNAL_ERROR');
  }
});

/**
 * PATCH /api/bids/[id]
 * Update a bid
 */
export const PATCH = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const { id } = params;
    const body: UpdateBidDTO = await request.json();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.amount !== undefined) updateData.amount = body.amount;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.pm_notes !== undefined) updateData.pm_notes = body.pm_notes;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.scope_coverage !== undefined) updateData.scope_coverage = body.scope_coverage;
    if (body.actual_cost !== undefined) updateData.actual_cost = body.actual_cost;
    if (body.change_orders_total !== undefined) {
      updateData.change_orders_total = body.change_orders_total;

      // Auto-calculate variance if we have both actual_cost and amount
      if (body.actual_cost !== undefined) {
        const bid = await supabaseAdmin.from('bids').select('amount').eq('id', id).single();
        if (bid.data) {
          const variance = ((body.actual_cost - bid.data.amount) / bid.data.amount) * 100;
          updateData.variance_percent = variance;
        }
      }
    }

    const { data: bid, error } = await supabaseAdmin
      .from('bids')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        contractor:contractors(id, name, phone, email),
        project:projects(id, name),
        bid_round:bid_rounds!bids_bid_round_id_fkey(id, name)
      `)
      .single();

    if (error) {
      console.error('[Bid API] Update error:', error);
      throw new APIError(error.message || 'Failed to update bid', 500, 'DATABASE_ERROR');
    }

    return successResponse(bid);
  } catch (error) {
    console.error('[Bid API] PATCH error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to update bid', 500, 'INTERNAL_ERROR');
  }
});

/**
 * DELETE /api/bids/[id]
 * Delete a bid
 */
export const DELETE = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const { id } = params;

    const { error } = await supabaseAdmin
      .from('bids')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Bid API] Delete error:', error);
      throw new APIError(error.message || 'Failed to delete bid', 500, 'DATABASE_ERROR');
    }

    return successResponse({ message: 'Bid deleted successfully' });
  } catch (error) {
    console.error('[Bid API] DELETE error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to delete bid', 500, 'INTERNAL_ERROR');
  }
});
