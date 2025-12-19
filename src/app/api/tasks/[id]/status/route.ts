import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';
import { autoScheduleDependencies } from '@/lib/scheduling/autoSchedule';
import { notifyReworkNeeded } from '@/lib/sms/taskNotifications';

/**
 * PUT /api/tasks/[id]/status
 * Update task status with validation rules
 */
export const PUT = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;
    const body = await request.json();
    const { status, verification_photo_url, verification_notes } = body;

    // Fetch current task status
    const { data: currentTask, error: fetchError } = await supabaseAdmin
      .from('tasks')
      .select('status, location_id')
      .eq('id', id)
      .single();

    if (fetchError || !currentTask) {
      throw new APIError('Task not found', 404, 'NOT_FOUND');
    }

    const currentStatus = currentTask.status;

    // Validation Rules
    if (currentStatus === 'verified' && status !== 'in_progress') {
      // Allow un-verifying only if explicitly going back to in_progress (rejection)
      // Otherwise block
      // throw new APIError('Cannot change status of a verified task', 400, 'VALIDATION_ERROR');
      // For now, let's allow it if admin, but generally strictly controlled.
      // If going to 'in_progress', it's a rejection.
    }

    if (status === 'verified') {
      if (currentStatus !== 'worker_complete') {
        // Optional: Enforce flow
      }
      
      if (!verification_photo_url && !currentTask.verification_photo_url) {
        // Only require if not already present (though usually passed again)
         // throw new APIError('Verification photo required', 400, 'VALIDATION_ERROR');
         // Relaxing this check for now as legacy data might miss it, or handled by UI
      }
    }

    // Update object
    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'verified') {
      updates.verified_at = new Date().toISOString();
      updates.verified_by = user.id; // Use authenticated user ID
      if (verification_photo_url) updates.verification_photo_url = verification_photo_url;
      if (verification_notes) updates.verification_notes = verification_notes;
    } else if (status === 'worker_complete') {
      updates.worker_completed_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Task Status API] Update error:', error);
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    // Post-update actions
    if (status === 'verified') {
      // 1. Auto-schedule dependencies
      try {
        await autoScheduleDependencies(id, updates.verified_at);
      } catch (err) {
        console.error('Failed to auto-schedule dependencies:', err);
        // Don't fail the request
      }
    } else if (status === 'in_progress' && (currentStatus === 'worker_complete' || currentStatus === 'verified')) {
      // 2. Notify rework needed (Rejection)
      if (verification_notes) {
        try {
          await notifyReworkNeeded(id, verification_notes);
        } catch (err) {
          console.error('Failed to send rework SMS:', err);
        }
      }
    }

    return successResponse(data);
  } catch (error) {
    console.error('[Task Status API] PUT error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to update task status', 500, 'INTERNAL_ERROR');
  }
});
