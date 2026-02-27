import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/action-items/[id]
 * Get a single action item
 */
export const GET = withAuth(async (request: NextRequest, user: any, context: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = context.params;

    const { data: item, error } = await supabaseAdmin
      .from('action_items')
      .select(`
        *,
        project:projects(id, name, current_phase),
        created_by_user:users!action_items_created_by_fkey(id, name, email),
        resolved_by_user:users!action_items_resolved_by_fkey(id, name, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Action Items API] Get error:', error);
      throw new APIError('Failed to fetch action item', 500, 'DATABASE_ERROR');
    }

    if (!item) {
      throw new APIError('Action item not found', 404, 'NOT_FOUND');
    }

    return successResponse({ item });
  } catch (error) {
    console.error('[Action Items API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch action item', 500, 'INTERNAL_ERROR');
  }
});

/**
 * PUT /api/action-items/[id]
 * Update an action item
 */
export const PUT = withAuth(async (request: NextRequest, user: any, context: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = context.params;
    const body = await request.json();

    const {
      title,
      description,
      priority,
      type,
      status,
      waiting_on,
      follow_up_date,
      resolution_note,
    } = body;

    // Build update object
    const updateData: any = {
      last_touched_at: new Date().toISOString(),
    };

    if (title !== undefined) {
      if (!title?.trim()) {
        throw new APIError('Title cannot be empty', 400, 'VALIDATION_ERROR');
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (priority !== undefined) {
      const priorityNum = parseInt(priority);
      if (priorityNum < 1 || priorityNum > 5) {
        throw new APIError('Priority must be between 1 and 5', 400, 'VALIDATION_ERROR');
      }

      // If priority changed, track for stale detection
      const { data: currentItem } = await supabaseAdmin
        .from('action_items')
        .select('priority')
        .eq('id', id)
        .single();

      if (currentItem && currentItem.priority !== priorityNum) {
        updateData.prev_priority = currentItem.priority;
        updateData.is_stale = false;
        updateData.days_bumped = 0;
      }

      updateData.priority = priorityNum;
    }

    if (type !== undefined) {
      updateData.type = type;
    }

    if (status !== undefined) {
      updateData.status = status;

      // If resolving, set resolved timestamp
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user.id;
      }
    }

    if (waiting_on !== undefined) {
      updateData.waiting_on = waiting_on?.trim() || null;
    }

    if (follow_up_date !== undefined) {
      updateData.follow_up_date = follow_up_date || null;
    }

    if (resolution_note !== undefined) {
      updateData.resolution_note = resolution_note?.trim() || null;
    }

    const { data: item, error } = await supabaseAdmin
      .from('action_items')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        project:projects(id, name, current_phase)
      `)
      .single();

    if (error) {
      console.error('[Action Items API] Update error:', error);
      throw new APIError(error.message || 'Failed to update action item', 500, 'DATABASE_ERROR');
    }

    if (!item) {
      throw new APIError('Action item not found', 404, 'NOT_FOUND');
    }

    console.log(`[Action Items API] Updated action item: ${item.id}`);
    return successResponse({ item });
  } catch (error) {
    console.error('[Action Items API] PUT error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to update action item', 500, 'INTERNAL_ERROR');
  }
});

/**
 * DELETE /api/action-items/[id]
 * Delete an action item
 */
export const DELETE = withAuth(async (request: NextRequest, user: any, context: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = context.params;

    const { error } = await supabaseAdmin
      .from('action_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Action Items API] Delete error:', error);
      throw new APIError(error.message || 'Failed to delete action item', 500, 'DATABASE_ERROR');
    }

    console.log(`[Action Items API] Deleted action item: ${id}`);
    return successResponse({ message: 'Action item deleted successfully' });
  } catch (error) {
    console.error('[Action Items API] DELETE error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to delete action item', 500, 'INTERNAL_ERROR');
  }
});
