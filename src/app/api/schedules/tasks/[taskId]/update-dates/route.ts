import { NextResponse, NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse } from '@/lib/apiHelpers';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { cascadeTaskUpdates } from '@/lib/scheduling/cascade';

export const PUT = withAuth(async (request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) => {
  const { taskId } = await params;
  
  if (!supabaseAdmin) {
    return errorResponse('Server misconfigured', 500);
  }

  try {
    const body = await request.json();
    const { start_date, end_date } = body;

    if (!start_date || !end_date) {
      return errorResponse('Start and end dates are required', 400);
    }

    // 1. Update Task
    const { data: task, error: taskError } = await supabaseAdmin
      .from('schedule_tasks')
      .update({
        start_date,
        end_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (taskError) {
      console.error('Error updating task dates:', taskError);
      return errorResponse(taskError.message, 500);
    }

    // 2. Trigger Cascade Updates
    await cascadeTaskUpdates(supabaseAdmin, taskId, end_date, task.schedule_id);

    return successResponse({ data: task });
  } catch (error) {
    console.error('Error updating task:', error);
    return errorResponse('Invalid request', 400);
  }
});





