import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/backlog
 * List backlog items with optional filters
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolio_id');
    const propertyId = searchParams.get('property_id');
    const status = searchParams.get('status') || 'active';
    const scopeLevel = searchParams.get('scope_level');

    let query = supabaseAdmin
      .from('backlog_items')
      .select(`
        *,
        portfolio:portfolios (id, name, code),
        property:projects!backlog_items_property_id_fkey (id, name, address)
      `);

    if (portfolioId) query = query.eq('portfolio_id', portfolioId);
    if (propertyId) query = query.eq('property_id', propertyId);
    if (status !== 'all') query = query.eq('status', status);
    if (scopeLevel) query = query.eq('scope_level', scopeLevel);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[Backlog API] Query error:', error);
      throw new APIError(error.message || 'Failed to fetch backlog items', 500, 'DATABASE_ERROR');
    }

    return successResponse({ items: data });
  } catch (error) {
    console.error('[Backlog API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch backlog items', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/backlog
 * Create a new backlog item
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const {
      title,
      description,
      scope_level,
      portfolio_id,
      property_id,
      estimated_cost,
    } = body;

    if (!title?.trim()) {
      throw new APIError('Title is required', 400, 'VALIDATION_ERROR');
    }

    if (scope_level === 'portfolio' && !portfolio_id) {
      throw new APIError('Portfolio ID required for portfolio-level items', 400, 'VALIDATION_ERROR');
    }

    if (scope_level === 'property' && !property_id) {
      throw new APIError('Property ID required for property-level items', 400, 'VALIDATION_ERROR');
    }

    const { data, error } = await supabaseAdmin
      .from('backlog_items')
      .insert([{
        title: title.trim(),
        description: description?.trim() || null,
        scope_level,
        portfolio_id: scope_level === 'portfolio' ? portfolio_id : null,
        property_id: scope_level === 'property' ? property_id : null,
        estimated_cost: estimated_cost ? parseFloat(estimated_cost) : null,
        status: 'active',
        created_by: user.uuid || null,
      }])
      .select()
      .single();

    if (error) {
      console.error('[Backlog API] Insert error:', error);
      throw new APIError(error.message || 'Failed to create backlog item', 500, 'DATABASE_ERROR');
    }

    console.log(`[Backlog API] Created backlog item: ${data.id} - ${data.title}`);
    return successResponse({ item: data }, 201);
  } catch (error) {
    console.error('[Backlog API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to create backlog item', 500, 'INTERNAL_ERROR');
  }
});
