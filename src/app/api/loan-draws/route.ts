import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/loan-draws
 * List loan draws with optional filters
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { searchParams } = new URL(request.url);
    const fundingSourceId = searchParams.get('funding_source_id');
    const portfolioId = searchParams.get('portfolio_id');
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('loan_draws')
      .select(`
        *,
        funding_source:funding_sources (
          id,
          name,
          type,
          portfolio:portfolios (
            id,
            name,
            code
          )
        )
      `);

    if (fundingSourceId) {
      query = query.eq('funding_source_id', fundingSourceId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[Loan Draws API] Query error:', error);
      throw new APIError(error.message || 'Failed to fetch draws', 500, 'DATABASE_ERROR');
    }

    let filteredData = data;
    if (portfolioId && data) {
      filteredData = data.filter((draw: any) => 
        draw.funding_source?.portfolio?.id === portfolioId
      );
    }

    return successResponse({ draws: filteredData });
  } catch (error) {
    console.error('[Loan Draws API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch draws', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/loan-draws
 * Create a new draw request
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const { funding_source_id, amount_requested, notes } = body;

    if (!funding_source_id) {
      throw new APIError('funding_source_id is required', 400, 'VALIDATION_ERROR');
    }

    if (!amount_requested || amount_requested <= 0) {
      throw new APIError('amount_requested must be greater than 0', 400, 'VALIDATION_ERROR');
    }

    const { data: fundingSource, error: fsError } = await supabaseAdmin
      .from('funding_sources')
      .select('id, commitment_amount, drawn_amount')
      .eq('id', funding_source_id)
      .single();

    if (fsError || !fundingSource) {
      throw new APIError('Invalid funding source', 400, 'INVALID_FUNDING_SOURCE');
    }

    const remaining = fundingSource.commitment_amount - fundingSource.drawn_amount;
    if (amount_requested > remaining) {
      throw new APIError(
        `Draw amount exceeds remaining capacity ($${remaining.toFixed(2)})`,
        400,
        'EXCEEDS_REMAINING'
      );
    }

    const { data: maxDraw } = await supabaseAdmin
      .from('loan_draws')
      .select('draw_number')
      .eq('funding_source_id', funding_source_id)
      .order('draw_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextNumber = maxDraw ? maxDraw.draw_number + 1 : 1;

    const { data, error } = await supabaseAdmin
      .from('loan_draws')
      .insert([{
        funding_source_id,
        draw_number: nextNumber,
        request_date: new Date().toISOString().split('T')[0],
        amount_requested,
        status: 'draft',
        notes,
      }])
      .select()
      .single();

    if (error) {
      console.error('[Loan Draws API] Insert error:', error);
      throw new APIError(error.message || 'Failed to create draw', 500, 'DATABASE_ERROR');
    }

    console.log(`[Loan Draws API] Created draw: ${data.id} - Draw #${data.draw_number}`);
    return successResponse({ draw: data }, 201);
  } catch (error) {
    console.error('[Loan Draws API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to create draw', 500, 'INTERNAL_ERROR');
  }
});
