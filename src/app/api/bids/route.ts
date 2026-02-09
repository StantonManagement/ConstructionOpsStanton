import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';
import { CreateBidDTO } from '@/types/bid';

/**
 * GET /api/bids
 * List all bids with optional filters
 * Query params:
 *   - bid_round_id: Filter by bid round
 *   - contractor_id: Filter by contractor
 *   - project_id: Filter by project
 *   - status: Filter by status
 */
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { searchParams } = new URL(request.url);
    const bidRoundId = searchParams.get('bid_round_id');
    const contractorId = searchParams.get('contractor_id');
    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('bids')
      .select(`
        *,
        contractor:contractors(id, name, phone, email),
        project:projects(id, name),
        bid_round:bid_rounds(id, name)
      `)
      .order('created_at', { ascending: false });

    if (bidRoundId) {
      query = query.eq('bid_round_id', bidRoundId);
    }
    if (contractorId) {
      query = query.eq('contractor_id', contractorId);
    }
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: bids, error } = await query;

    if (error) {
      console.error('[Bids API] Query error:', error);
      throw new APIError(error.message || 'Failed to fetch bids', 500, 'DATABASE_ERROR');
    }

    return successResponse(bids || []);
  } catch (error) {
    console.error('[Bids API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch bids', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/bids
 * Create a new bid
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body: CreateBidDTO = await request.json();

    // Validation
    if (!body.contractor_id) {
      throw new APIError('contractor_id is required', 400, 'VALIDATION_ERROR');
    }
    if (!body.amount || body.amount < 0) {
      throw new APIError('Valid amount is required', 400, 'VALIDATION_ERROR');
    }

    const bidData = {
      contractor_id: body.contractor_id,
      amount: body.amount,
      project_id: body.project_id || null,
      bid_round_id: body.bid_round_id || null,
      notes: body.notes || null,
      source_type: body.source_type || 'manual',
      source_url: body.source_url || null,
      scope_coverage: body.scope_coverage || [],
      status: 'draft',
      created_by: user.id,
    };

    const { data: bid, error } = await supabaseAdmin
      .from('bids')
      .insert(bidData)
      .select(`
        *,
        contractor:contractors(id, name, phone, email),
        project:projects(id, name),
        bid_round:bid_rounds(id, name)
      `)
      .single();

    if (error) {
      console.error('[Bids API] Insert error:', error);
      throw new APIError(error.message || 'Failed to create bid', 500, 'DATABASE_ERROR');
    }

    return successResponse(bid, 201);
  } catch (error) {
    console.error('[Bids API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to create bid', 500, 'INTERNAL_ERROR');
  }
});
