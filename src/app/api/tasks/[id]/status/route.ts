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
      .select('status, location_id, verification_photo_url')
      .eq('id', id)
      .single();

    if (fetchError || !currentTask) {
      throw new APIError('Task not found', 404, 'NOT_FOUND');
    }

    const currentStatus = currentTask.status;

    const allowedStatuses = new Set(['not_started', 'in_progress', 'worker_complete', 'verified']);
    if (!allowedStatuses.has(status)) {
      throw new APIError('Invalid status', 400, 'VALIDATION_ERROR');
    }

    // Validation Rules
    const notesProvided = typeof verification_notes === 'string' && verification_notes.trim().length > 0;

    if (currentStatus === 'verified' && status !== 'verified') {
      if (status === 'in_progress' && notesProvided) {
        // Allow rejection/rework from verified back to in_progress
      } else {
        throw new APIError('Cannot change status of a verified task', 400, 'VALIDATION_ERROR');
      }
    }

    // No-op transition is allowed (keeps endpoint idempotent)
    if (status !== currentStatus) {
      if (status !== 'not_started') {
        if (currentStatus === 'not_started' && status !== 'in_progress') {
          throw new APIError('Invalid status transition', 400, 'VALIDATION_ERROR');
        }

        if (currentStatus === 'in_progress' && status !== 'worker_complete') {
          throw new APIError('Invalid status transition', 400, 'VALIDATION_ERROR');
        }

        if (currentStatus === 'worker_complete' && status !== 'verified' && status !== 'in_progress') {
          throw new APIError('Invalid status transition', 400, 'VALIDATION_ERROR');
        }

        if (currentStatus === 'worker_complete' && status === 'in_progress' && !notesProvided) {
          throw new APIError('Rework notes required', 400, 'VALIDATION_ERROR');
        }
      }

      if (status === 'verified') {
        if (currentStatus !== 'worker_complete') {
          throw new APIError('Task must be worker complete before it can be verified', 400, 'VALIDATION_ERROR');
        }

        if (!verification_photo_url && !currentTask.verification_photo_url) {
          throw new APIError('Verification photo required', 400, 'VALIDATION_ERROR');
        }
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
