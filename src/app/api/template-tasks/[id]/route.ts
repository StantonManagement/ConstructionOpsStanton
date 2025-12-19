import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * PUT /api/template-tasks/[id]
 * Update a template task
 */
export const PUT = withAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      default_duration_days, 
      default_budget_category_id, 
      estimated_cost, 
      sort_order,
      depends_on_sort_order
    } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (default_duration_days !== undefined) updates.default_duration_days = default_duration_days;
    if (default_budget_category_id !== undefined) updates.default_budget_category_id = default_budget_category_id;
    if (estimated_cost !== undefined) updates.estimated_cost = estimated_cost;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (depends_on_sort_order !== undefined) updates.depends_on_sort_order = depends_on_sort_order;

    const { data, error } = await supabaseAdmin
      .from('template_tasks')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('[Template Task API] Update error:', error);
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data);
  } catch (error) {
    console.error('[Template Task API] PUT error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to update template task', 500, 'INTERNAL_ERROR');
  }
});

/**
 * DELETE /api/template-tasks/[id]
 * Delete a template task
 */
export const DELETE = withAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { error } = await supabaseAdmin
      .from('template_tasks')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('[Template Task API] Delete error:', error);
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse({ success: true });
  } catch (error) {
    console.error('[Template Task API] DELETE error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to delete template task', 500, 'INTERNAL_ERROR');
  }
});
