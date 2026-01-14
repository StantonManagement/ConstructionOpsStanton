import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/funding-sources
 * List all funding sources with optional filters
 */
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolio_id');
    const type = searchParams.get('type');
    const activeOnly = searchParams.get('active') !== 'false';

    let query = supabaseAdmin
      .from('funding_sources')
      .select(`
        *,
        portfolio:portfolios (
          id,
          name,
          code
        )
      `)
      .order('name');

    if (portfolioId) {
      query = query.eq('portfolio_id', portfolioId);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Funding Sources API] Query error:', error);
      throw new APIError(error.message || 'Failed to fetch funding sources', 500, 'DATABASE_ERROR');
    }

    // Add computed remaining
    const enriched = data?.map(fs => ({
      ...fs,
      remaining: (fs.commitment_amount || 0) - (fs.drawn_amount || 0)
    }));

    return successResponse({ funding_sources: enriched });
  } catch (error) {
    console.error('[Funding Sources API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch funding sources', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/funding-sources
 * Create a new funding source
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const {
      portfolio_id,
      name,
      type,
      lender_name,
      commitment_amount,
      drawn_amount,
      interest_rate,
      maturity_date,
      loan_number,
      notes
    } = body;

    if (!portfolio_id) {
      throw new APIError('Portfolio ID is required', 400, 'VALIDATION_ERROR');
    }
    if (!name) {
      throw new APIError('Name is required', 400, 'VALIDATION_ERROR');
    }
    if (!type || !['loan', 'grant', 'equity', 'other'].includes(type)) {
      throw new APIError('Valid type is required (loan, grant, equity, other)', 400, 'VALIDATION_ERROR');
    }

    const { data, error } = await supabaseAdmin
      .from('funding_sources')
      .insert({
        portfolio_id,
        name,
        type,
        lender_name,
        commitment_amount: commitment_amount || 0,
        drawn_amount: drawn_amount || 0,
        interest_rate,
        maturity_date,
        loan_number,
        notes,
        is_active: true
      })
      .select(`
        *,
        portfolio:portfolios (id, name, code)
      `)
      .single();

    if (error) {
      console.error('[Funding Sources API] Insert error:', error);
      throw new APIError(error.message || 'Failed to create funding source', 500, 'DATABASE_ERROR');
    }

    console.log(`[Funding Sources API] Created funding source: ${data.id} - ${data.name}`);
    return successResponse({ funding_source: data }, 201);
  } catch (error) {
    console.error('[Funding Sources API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to create funding source', 500, 'INTERNAL_ERROR');
  }
});
