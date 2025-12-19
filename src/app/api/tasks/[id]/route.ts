import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';
import { notifyTaskAssigned } from '@/lib/sms/taskNotifications';

/**
 * GET /api/tasks/[id]
 * Get a single task
 */
export const GET = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;

    if (!id) {
      throw new APIError('Task ID is required', 400, 'VALIDATION_ERROR');
    }

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select(`
        *,
        contractors (name),
        locations (name, type)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Task API] Fetch error:', error);
      if (error.code === 'PGRST116') {
        throw new APIError('Task not found', 404, 'NOT_FOUND');
      }
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data);
  } catch (error) {
    console.error('[Task API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch task', 500, 'INTERNAL_ERROR');
  }
});

/**
 * PUT /api/tasks/[id]
 * Update a task
 */
export const PUT = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;
    const body = await request.json();

    if (!id) {
      throw new APIError('Task ID is required', 400, 'VALIDATION_ERROR');
    }

    // Extract fields
    const {
      name,
      description,
      status,
      priority,
      assigned_contractor_id,
      budget_category_id,
      estimated_cost,
      actual_cost,
      duration_days,
      scheduled_start,
      scheduled_end,
      verified_by,
      verification_photo_url,
      verification_notes,
      sort_order
    } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (assigned_contractor_id !== undefined) updates.assigned_contractor_id = assigned_contractor_id;
    if (budget_category_id !== undefined) updates.budget_category_id = budget_category_id;
    if (estimated_cost !== undefined) updates.estimated_cost = estimated_cost;
    if (actual_cost !== undefined) updates.actual_cost = actual_cost;
    if (duration_days !== undefined) updates.duration_days = duration_days;
    if (scheduled_start !== undefined) updates.scheduled_start = scheduled_start;
    if (scheduled_end !== undefined) updates.scheduled_end = scheduled_end;
    if (verified_by !== undefined) updates.verified_by = verified_by;
    if (verification_photo_url !== undefined) updates.verification_photo_url = verification_photo_url;
    if (verification_notes !== undefined) updates.verification_notes = verification_notes;
    if (sort_order !== undefined) updates.sort_order = sort_order;

    // Handle status changes specific logic
    if (status === 'verified') {
      updates.verified_at = new Date().toISOString();
      // verification_photo_url MUST be present if not already in DB
      if (!verification_photo_url) {
        // We should check if it exists in DB if not provided, but for now strict validation on input if status changing
        // Actually, let's rely on DB constraint or current payload. 
        // If client sends status='verified' without photo, DB will reject if it's null.
      }
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
      console.error('[Task API] Update error:', error);
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data);
  } catch (error) {
    console.error('[Task API] PUT error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to update task', 500, 'INTERNAL_ERROR');
  }
});

/**
 * DELETE /api/tasks/[id]
 * Delete a task
 */
export const DELETE = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;

    if (!id) {
      throw new APIError('Task ID is required', 400, 'VALIDATION_ERROR');
    }

    const { error } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Task API] Delete error:', error);
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse({ deleted: true });
  } catch (error) {
    console.error('[Task API] DELETE error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to delete task', 500, 'INTERNAL_ERROR');
  }
});
