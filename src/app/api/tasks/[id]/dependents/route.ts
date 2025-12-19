import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/tasks/[id]/dependents
 * List tasks that depend on this task ("Blocks" list)
 */
export const GET = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('task_dependencies')
      .select(
        `
        id,
        task:tasks!task_id (
          id,
          name,
          status,
          scheduled_start,
          scheduled_end
        )
      `
      )
      .eq('depends_on_task_id', id);

    if (error) {
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch dependents', 500, 'INTERNAL_ERROR');
  }
});
