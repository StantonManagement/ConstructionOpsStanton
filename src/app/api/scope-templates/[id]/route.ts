import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';
import { UpdateScopeTemplateDTO } from '@/types/bid';

/**
 * GET /api/scope-templates/[id]
 * Get a specific scope template
 */
export const GET = withAuth(async (request: NextRequest, context: { params: { id: string } }, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = context.params;

    const { data: template, error } = await supabaseAdmin
      .from('bid_scope_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new APIError('Scope template not found', 404, 'NOT_FOUND');
      }
      console.error('[Scope Template API] Query error:', error);
      throw new APIError(error.message || 'Failed to fetch scope template', 500, 'DATABASE_ERROR');
    }

    return successResponse(template);
  } catch (error) {
    console.error('[Scope Template API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch scope template', 500, 'INTERNAL_ERROR');
  }
});

/**
 * PATCH /api/scope-templates/[id]
 * Update a scope template
 */
export const PATCH = withAuth(async (request: NextRequest, context: { params: { id: string } }, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = context.params;
    const body: UpdateScopeTemplateDTO = await request.json();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.trade !== undefined) updateData.trade = body.trade;
    if (body.scope_type !== undefined) updateData.scope_type = body.scope_type;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.scope_items !== undefined) updateData.scope_items = body.scope_items;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data: template, error } = await supabaseAdmin
      .from('bid_scope_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Scope Template API] Update error:', error);
      throw new APIError(error.message || 'Failed to update scope template', 500, 'DATABASE_ERROR');
    }

    return successResponse(template);
  } catch (error) {
    console.error('[Scope Template API] PATCH error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to update scope template', 500, 'INTERNAL_ERROR');
  }
});

/**
 * DELETE /api/scope-templates/[id]
 * Delete a scope template (soft delete by setting is_active to false)
 */
export const DELETE = withAuth(async (request: NextRequest, context: { params: { id: string } }, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = context.params;

    // Soft delete by setting is_active to false
    const { error } = await supabaseAdmin
      .from('bid_scope_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[Scope Template API] Delete error:', error);
      throw new APIError(error.message || 'Failed to delete scope template', 500, 'DATABASE_ERROR');
    }

    return successResponse({ message: 'Scope template deleted successfully' });
  } catch (error) {
    console.error('[Scope Template API] DELETE error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to delete scope template', 500, 'INTERNAL_ERROR');
  }
});
