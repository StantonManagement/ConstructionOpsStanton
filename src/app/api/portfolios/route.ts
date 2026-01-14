import { NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';
import { supabaseAdmin } from '@/lib/supabaseClient';

// GET /api/portfolios - List all portfolios
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Database not available', 500, 'DB_ERROR');
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') !== 'false';

    let query = supabaseAdmin
      .from('portfolios')
      .select(`
        *,
        funding_sources (
          id,
          name,
          type,
          commitment_amount,
          drawn_amount
        ),
        projects (
          id,
          name
        )
      `)
      .order('name');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw new APIError(error.message, 500, 'QUERY_ERROR');

    // Add computed totals per portfolio
    const enriched = data?.map(portfolio => ({
      ...portfolio,
      totals: {
        funding_sources: portfolio.funding_sources?.length || 0,
        projects: portfolio.projects?.length || 0,
        commitment: portfolio.funding_sources?.reduce((sum: number, fs: any) => sum + (fs.commitment_amount || 0), 0) || 0,
        drawn: portfolio.funding_sources?.reduce((sum: number, fs: any) => sum + (fs.drawn_amount || 0), 0) || 0,
      }
    }));

    return successResponse({ portfolios: enriched }, 200);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Internal server error', 500, 'UNKNOWN');
  }
});

// POST /api/portfolios - Create portfolio
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Database not available', 500, 'DB_ERROR');
    }

    const body = await request.json();
    const { name, code, description, owner_entity_id } = body;

    if (!name) {
      throw new APIError('Portfolio name is required', 400, 'VALIDATION_ERROR');
    }

    const { data, error } = await supabaseAdmin
      .from('portfolios')
      .insert({
        name,
        code: code || name.substring(0, 10).toUpperCase().replace(/\s/g, '-'),
        description,
        owner_entity_id,
        is_active: true
      })
      .select()
      .single();

    if (error) throw new APIError(error.message, 500, 'INSERT_ERROR');

    return successResponse({ portfolio: data }, 201);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Internal server error', 500, 'UNKNOWN');
  }
});
