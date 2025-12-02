import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  errorResponse, 
  APIError 
} from '@/lib/apiHelpers';

/**
 * PUT /api/schedules/tasks/[taskId]/assign-budget
 * Assigns a schedule task to a budget category
 */
export const PUT = withAuth(async (request: NextRequest, context: { params: Promise<{ taskId: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const taskId = params.taskId;

    if (!taskId) {
      throw new APIError('Invalid task ID', 400, 'VALIDATION_ERROR');
    }

    const body = await request.json();
    const { budget_category_id } = body;

    // Validate budget_category_id is number or null
    if (budget_category_id !== null && typeof budget_category_id !== 'number') {
      throw new APIError('Invalid budget category ID', 400, 'VALIDATION_ERROR');
    }

    // 1. Check if task exists
    const { data: task, error: taskError } = await supabaseAdmin
      .from('schedule_tasks')
      .select('id, schedule_id')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      throw new APIError('Task not found', 404, 'NOT_FOUND');
    }

    // 2. If assigning to a category, verify category exists
    // (Optional but good for integrity, though FK constraint handles it too)
    if (budget_category_id) {
        // We could verify project match here but that requires multiple joins
        // Relying on FK constraint for now
    }

    // 3. Update task
    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from('schedule_tasks')
      .update({ 
        budget_category_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) {
      console.error('[Schedule API] Update error:', updateError);
      throw new APIError('Failed to assign budget category', 500, 'DATABASE_ERROR');
    }

    return successResponse({ task: updatedTask });

  } catch (error) {
    console.error('[Schedule API] Assign budget error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to assign task to budget', 500, 'INTERNAL_ERROR');
  }
});


