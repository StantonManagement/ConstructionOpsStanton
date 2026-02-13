import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';
import { CreateScopeTemplateDTO } from '@/types/bid';

/**
 * GET /api/scope-templates
 * List all scope templates with optional filters
 * Query params:
 *   - trade: Filter by trade
 *   - scope_type: Filter by scope type
 *   - is_active: Filter by active status (true/false)
 */
export const GET = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { searchParams } = new URL(request.url);
    const trade = searchParams.get('trade');
    const scopeType = searchParams.get('scope_type');
    const isActive = searchParams.get('is_active');

    let query = supabaseAdmin
      .from('bid_scope_templates')
      .select('*')
      .order('trade')
      .order('scope_type')
      .order('name');

    if (trade) {
      query = query.eq('trade', trade);
    }
    if (scopeType) {
      query = query.eq('scope_type', scopeType);
    }
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('[Scope Templates API] Query error:', error);
      throw new APIError(error.message || 'Failed to fetch scope templates', 500, 'DATABASE_ERROR');
    }

    return successResponse(templates || []);
  } catch (error) {
    console.error('[Scope Templates API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch scope templates', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/scope-templates
 * Create a new scope template
 */
export const POST = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body: CreateScopeTemplateDTO = await request.json();

    // Validation
    if (!body.trade) {
      throw new APIError('trade is required', 400, 'VALIDATION_ERROR');
    }
    if (!body.scope_type) {
      throw new APIError('scope_type is required', 400, 'VALIDATION_ERROR');
    }
    if (!body.name) {
      throw new APIError('name is required', 400, 'VALIDATION_ERROR');
    }
    if (!body.scope_items || body.scope_items.length === 0) {
      throw new APIError('scope_items are required', 400, 'VALIDATION_ERROR');
    }

    const templateData = {
      trade: body.trade,
      scope_type: body.scope_type,
      name: body.name,
      description: body.description || null,
      scope_items: body.scope_items,
      is_active: true,
    };

    const { data: template, error } = await supabaseAdmin
      .from('bid_scope_templates')
      .insert(templateData)
      .select()
      .single();

    if (error) {
      console.error('[Scope Templates API] Insert error:', error);
      throw new APIError(error.message || 'Failed to create scope template', 500, 'DATABASE_ERROR');
    }

    return successResponse(template, 201);
  } catch (error) {
    console.error('[Scope Templates API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to create scope template', 500, 'INTERNAL_ERROR');
  }
});
