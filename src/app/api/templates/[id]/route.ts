import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/templates/[id]
 * Get single template with tasks
 */
export const GET = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { data, error } = await supabaseAdmin
      .from('scope_templates')
      .select(`
        *,
        tasks:template_tasks(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Template API] Fetch error:', error);
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    // Sort tasks by sort_order
    if (data && data.tasks) {
      data.tasks.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    return successResponse(data);
  } catch (error) {
    console.error('[Template API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch template', 500, 'INTERNAL_ERROR');
  }
});

/**
 * PUT /api/templates/[id]
 * Update template details
 */
export const PUT = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const { name, description, unit_type, is_active } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (unit_type !== undefined) updates.unit_type = unit_type;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from('scope_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Template API] Update error:', error);
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data);
  } catch (error) {
    console.error('[Template API] PUT error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to update template', 500, 'INTERNAL_ERROR');
  }
});

/**
 * DELETE /api/templates/[id]
 * Delete template
 */
export const DELETE = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { error } = await supabaseAdmin
      .from('scope_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Template API] Delete error:', error);
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse({ success: true });
  } catch (error) {
    console.error('[Template API] DELETE error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to delete template', 500, 'INTERNAL_ERROR');
  }
});
