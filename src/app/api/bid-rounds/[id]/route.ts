import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';
import { UpdateBidRoundDTO } from '@/types/bid';

/**
 * GET /api/bid-rounds/[id]
 * Get a specific bid round with all related bids
 */
export const GET = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const { id } = params;

    const { data: bidRound, error } = await supabaseAdmin
      .from('bid_rounds')
      .select(`
        *,
        project:projects(id, name),
        portfolio:portfolios(id, name),
        scope_template:bid_scope_templates(id, name, trade, scope_type, scope_items),
        winning_bid:bids!winning_bid_id(
          id,
          contractor_id,
          amount,
          status,
          contractor:contractors(id, name, phone, email, trade)
        ),
        bids!bids_bid_round_id_fkey(
          id,
          contractor_id,
          amount,
          status,
          submitted_at,
          notes,
          scope_coverage,
          actual_cost,
          change_orders_total,
          variance_percent,
          decline_reason,
          decline_notes,
          contractor:contractors(id, name, phone, email, trade)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new APIError('Bid round not found', 404, 'NOT_FOUND');
      }
      console.error('[Bid Round API] Query error:', error);
      throw new APIError(error.message || 'Failed to fetch bid round', 500, 'DATABASE_ERROR');
    }

    return successResponse(bidRound);
  } catch (error) {
    console.error('[Bid Round API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch bid round', 500, 'INTERNAL_ERROR');
  }
});

/**
 * PATCH /api/bid-rounds/[id]
 * Update a bid round
 */
export const PATCH = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const { id } = params;
    const body: UpdateBidRoundDTO = await request.json();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.trade !== undefined) updateData.trade = body.trade;
    if (body.scope_type !== undefined) updateData.scope_type = body.scope_type;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.scope_items !== undefined) updateData.scope_items = body.scope_items;
    if (body.deadline_date !== undefined) updateData.deadline_date = body.deadline_date;
    if (body.awarded_date !== undefined) updateData.awarded_date = body.awarded_date;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.winning_bid_id !== undefined) updateData.winning_bid_id = body.winning_bid_id;

    // If awarding a bid, update the winning bid status and losing bids
    if (body.winning_bid_id !== undefined && body.winning_bid_id !== null) {
      // Update winning bid to 'won'
      await supabaseAdmin
        .from('bids')
        .update({ status: 'won' })
        .eq('id', body.winning_bid_id);

      // Update other bids in this round to 'lost'
      await supabaseAdmin
        .from('bids')
        .update({ status: 'lost' })
        .eq('bid_round_id', id)
        .neq('id', body.winning_bid_id)
        .in('status', ['submitted', 'draft']);

      updateData.status = 'awarded';
      updateData.awarded_date = new Date().toISOString();
    }

    const { data: bidRound, error } = await supabaseAdmin
      .from('bid_rounds')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        project:projects(id, name),
        portfolio:portfolios(id, name),
        winning_bid:bids!winning_bid_id(id, contractor_id, amount, contractor:contractors(name))
      `)
      .single();

    if (error) {
      console.error('[Bid Round API] Update error:', error);
      throw new APIError(error.message || 'Failed to update bid round', 500, 'DATABASE_ERROR');
    }

    return successResponse(bidRound);
  } catch (error) {
    console.error('[Bid Round API] PATCH error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to update bid round', 500, 'INTERNAL_ERROR');
  }
});

/**
 * DELETE /api/bid-rounds/[id]
 * Delete a bid round (and cascade to related bids)
 */
export const DELETE = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const { id } = params;

    const { error } = await supabaseAdmin
      .from('bid_rounds')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Bid Round API] Delete error:', error);
      throw new APIError(error.message || 'Failed to delete bid round', 500, 'DATABASE_ERROR');
    }

    return successResponse({ message: 'Bid round deleted successfully' });
  } catch (error) {
    console.error('[Bid Round API] DELETE error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to delete bid round', 500, 'INTERNAL_ERROR');
  }
});
