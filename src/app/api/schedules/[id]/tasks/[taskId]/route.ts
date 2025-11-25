import { NextResponse, NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse } from '@/lib/apiHelpers';
import { supabaseAdmin } from '@/lib/supabaseClient';

export const PUT = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) => {
  const { id, taskId } = await params;
  
  if (!supabaseAdmin) {
    return errorResponse('Server misconfigured', 500);
  }

  try {
    const body = await request.json();
    const { 
      task_name, 
      description, 
      start_date, 
      end_date, 
      contractor_id, 
      status, 
      progress, 
      parent_task_id,
      predecessors 
    } = body;

    // 1. Update Task
    const { data: task, error: taskError } = await supabaseAdmin
      .from('schedule_tasks')
      .update({
        task_name,
        description,
        start_date,
        end_date,
        contractor_id,
        status,
        progress,
        parent_task_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .eq('schedule_id', id) // Safety check
      .select()
      .single();

    if (taskError) {
      return errorResponse(taskError.message, 500);
    }

    // 2. Update Dependencies if provided (Full replacement)
    if (predecessors !== undefined) {
      // Delete existing incoming dependencies
      await supabaseAdmin
        .from('schedule_dependencies')
        .delete()
        .eq('target_task_id', taskId);

      if (Array.isArray(predecessors) && predecessors.length > 0) {
        const dependencyInserts = predecessors.map((predId: string) => ({
          source_task_id: predId,
          target_task_id: taskId,
          dependency_type: 'finish_to_start',
          lag_days: 0
        }));

        await supabaseAdmin
          .from('schedule_dependencies')
          .insert(dependencyInserts);
      }
    }

    return successResponse({ data: task });
  } catch (error) {
    return errorResponse('Invalid request', 400);
  }
});

export const DELETE = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) => {
  const { id, taskId } = await params;
  
  if (!supabaseAdmin) {
    return errorResponse('Server misconfigured', 500);
  }

  const { error } = await supabaseAdmin
    .from('schedule_tasks')
    .delete()
    .eq('id', taskId)
    .eq('schedule_id', id);

  if (error) {
    return errorResponse(error.message, 500);
  }

  return successResponse({ success: true });
});
