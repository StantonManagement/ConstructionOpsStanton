import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';
import { CreateBidRoundDTO } from '@/types/bid';

/**
 * GET /api/bid-rounds
 * List all bid rounds with optional filters
 * Query params:
 *   - project_id: Filter by project
 *   - portfolio_id: Filter by portfolio
 *   - status: Filter by status
 *   - trade: Filter by trade
 */
export const GET = withAuth(async (request: NextRequest, context: unknown, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const portfolioId = searchParams.get('portfolio_id');
    const status = searchParams.get('status');
    const trade = searchParams.get('trade');

    let query = supabaseAdmin
      .from('bid_rounds')
      .select(`
        *,
        project:projects(id, name),
        portfolio:portfolios(id, name),
        winning_bid:bids!winning_bid_id(id, contractor_id, amount, contractor:contractors(name)),
        bids!bids_bid_round_id_fkey(id, contractor_id, amount, status, contractor:contractors(name))
      `)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (portfolioId) {
      query = query.eq('portfolio_id', portfolioId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (trade) {
      query = query.eq('trade', trade);
    }

    const { data: bidRounds, error } = await query;

    if (error) {
      console.error('[Bid Rounds API] Query error:', error);
      throw new APIError(error.message || 'Failed to fetch bid rounds', 500, 'DATABASE_ERROR');
    }

    return successResponse(bidRounds || []);
  } catch (error) {
    console.error('[Bid Rounds API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch bid rounds', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/bid-rounds
 * Create a new bid round
 */
export const POST = withAuth(async (request: NextRequest, context: unknown, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body: CreateBidRoundDTO = await request.json();

    // Validation
    if (!body.name) {
      throw new APIError('name is required', 400, 'VALIDATION_ERROR');
    }
    if (!body.trade) {
      throw new APIError('trade is required', 400, 'VALIDATION_ERROR');
    }

    const userId = (user as { id: string }).id;

    const bidRoundData = {
      project_id: body.project_id || null,
      portfolio_id: body.portfolio_id || null,
      name: body.name,
      trade: body.trade,
      scope_type: body.scope_type || null,
      description: body.description || null,
      scope_template_id: body.scope_template_id || null,
      scope_items: body.scope_items || [],
      deadline_date: body.deadline_date || null,
      status: 'draft',
      created_by: userId,
    };

    const { data: bidRound, error } = await supabaseAdmin
      .from('bid_rounds')
      .insert(bidRoundData)
      .select(`
        *,
        project:projects(id, name),
        portfolio:portfolios(id, name)
      `)
      .single();

    if (error) {
      console.error('[Bid Rounds API] Insert error:', error);
      throw new APIError(error.message || 'Failed to create bid round', 500, 'DATABASE_ERROR');
    }

    return successResponse(bidRound, 201);
  } catch (error) {
    console.error('[Bid Rounds API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to create bid round', 500, 'INTERNAL_ERROR');
  }
});
