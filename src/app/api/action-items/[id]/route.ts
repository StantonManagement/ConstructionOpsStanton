import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * PATCH /api/action-items/[id]
 * Update an existing action item
 *
 * Body: Any fields to update
 * {
 *   title?: string
 *   description?: string
 *   priority?: 1-5
 *   type?: string
 *   status?: string
 *   waiting_on?: string
 *   follow_up_date?: string
 *   resolution_note?: string
 *   stale?: boolean
 * }
 */
export const PATCH = withAuth(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
  user: unknown
) => {
  try {
    const params = await context.params;
    const id = params.id;
    const body = await request.json();

    // Validate priority if provided
    if (body.priority !== undefined && (body.priority < 1 || body.priority > 5)) {
      throw new APIError('Priority must be between 1 and 5', 400, 'VALIDATION_ERROR');
    }

    const updateData: Record<string, unknown> = {};

    // Only include fields that are present in the request body
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.waiting_on !== undefined) updateData.waiting_on = body.waiting_on;
    if (body.follow_up_date !== undefined) updateData.follow_up_date = body.follow_up_date;
    if (body.resolution_note !== undefined) updateData.resolution_note = body.resolution_note;
    if (body.stale !== undefined) updateData.stale = body.stale;
    if (body.assigned_to_user_id !== undefined) updateData.assigned_to_user_id = body.assigned_to_user_id;

    // If status is being set to resolved, mark resolved_at and resolved_by
    if (body.status === 'resolved') {
      const authenticatedUser = user as { id: string };
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by_user_id = authenticatedUser.id;
    }

    const { data, error } = await supabase
      .from('action_items')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        project:projects(id, name, type, status),
        assigned_to:assigned_to_user_id(id, email)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new APIError('Action item not found', 404, 'NOT_FOUND');
      }
      console.error('[PATCH /api/action-items/:id] Database error:', error);
      throw new APIError('Failed to update action item', 500, 'DATABASE_ERROR');
    }

    return successResponse({ action_item: data });
  } catch (error) {
    console.error('[PATCH /api/action-items/:id] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to update action item',
      500,
      'INTERNAL_ERROR'
    );
  }
});

/**
 * DELETE /api/action-items/[id]
 * Delete an action item (soft delete by marking as resolved)
 * Or hard delete if query param hard=true
 */
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
  user: unknown
) => {
  try {
    const params = await context.params;
    const id = params.id;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    if (hardDelete) {
      // Hard delete - actually remove from database
      const { error } = await supabase
        .from('action_items')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[DELETE /api/action-items/:id] Database error:', error);
        throw new APIError('Failed to delete action item', 500, 'DATABASE_ERROR');
      }

      return successResponse({ message: 'Action item deleted successfully' });
    } else {
      // Soft delete - mark as resolved
      const authenticatedUser = user as { id: string };

      const { data, error } = await supabase
        .from('action_items')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by_user_id: authenticatedUser.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new APIError('Action item not found', 404, 'NOT_FOUND');
        }
        console.error('[DELETE /api/action-items/:id] Database error:', error);
        throw new APIError('Failed to delete action item', 500, 'DATABASE_ERROR');
      }

      return successResponse({
        message: 'Action item marked as resolved',
        action_item: data
      });
    }
  } catch (error) {
    console.error('[DELETE /api/action-items/:id] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to delete action item',
      500,
      'INTERNAL_ERROR'
    );
  }
});
