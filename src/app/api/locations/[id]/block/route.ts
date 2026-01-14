import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';
import { notifyTaskUnblocked } from '@/lib/sms/taskNotifications';

/**
 * PUT /api/locations/[id]/block
 * Set location as blocked (on_hold)
 */
export const PUT = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }
    const body = await request.json();
    const { blocked_reason, blocked_note } = body;

    if (!blocked_reason) {
      throw new APIError('Blocked reason is required', 400, 'VALIDATION_ERROR');
    }

    const { data, error } = await supabaseAdmin
      .from('components')
      .update({
        status: 'on_hold',
        blocked_reason,
        blocked_note,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Block Location API] Update error:', error);
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data);
  } catch (error) {
    console.error('[Block Location API] PUT error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to block location', 500, 'INTERNAL_ERROR');
  }
});

/**
 * DELETE /api/locations/[id]/block
 * Unblock location (set to in_progress or not_started based on tasks? Or just clear hold?)
 * Plan says: Unblock location. Let's reset to in_progress as default "active" state or just clear the block fields.
 * If we assume unblocking means "ready to work", 'in_progress' is safe, or we could revert to 'not_started' if no tasks started.
 * For simplicity and field workflow, 'in_progress' is usually what happens after unblocking.
 */
export const DELETE = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    // We'll set it to 'in_progress' by default when unblocking
    const { data, error } = await supabaseAdmin
      .from('components')
      .update({
        status: 'in_progress',
        blocked_reason: null,
        blocked_note: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Block Location API] Unblock error:', error);
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    try {
      const { data: tasks } = await supabaseAdmin
        .from('tasks')
        .select('id')
        .eq('location_id', id)
        .not('assigned_contractor_id', 'is', null)
        .in('status', ['not_started', 'in_progress', 'worker_complete']);

      if (tasks && tasks.length > 0) {
        for (const t of tasks as any[]) {
          try {
            await notifyTaskUnblocked(t.id);
          } catch (err) {
            console.error('Failed to send task unblocked SMS:', err);
          }
        }
      }
    } catch (err) {
      console.error('Failed to query tasks for unblock SMS:', err);
    }

    return successResponse(data);
  } catch (error) {
    console.error('[Block Location API] DELETE error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to unblock location', 500, 'INTERNAL_ERROR');
  }
});
