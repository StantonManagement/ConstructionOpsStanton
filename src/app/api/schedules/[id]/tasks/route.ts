import { NextResponse, NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse } from '@/lib/apiHelpers';
import { supabaseAdmin } from '@/lib/supabaseClient';

export const POST = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }, user: any) => {
  const { id } = await params; // schedule_id

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
      predecessors,
      budget_category_id,
      // New fields
      duration_days,
      is_milestone
    } = body;

    if (!task_name || !start_date || !end_date) {
      return errorResponse('Missing required fields', 400);
    }

    // Get max sort order to append to end
    const { data: maxSort } = await supabaseAdmin
      .from('schedule_tasks')
      .select('sort_order')
      .eq('schedule_id', id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();
    
    const nextSortOrder = (maxSort?.sort_order || 0) + 1;

    // 1. Create Task
    const { data: task, error: taskError } = await supabaseAdmin
      .from('schedule_tasks')
      .insert({
        schedule_id: id,
        task_name,
        description,
        start_date,
        end_date,
        contractor_id,
        status: status || 'not_started',
        progress: progress || 0,
        parent_task_id,
        budget_category_id,
        sort_order: nextSortOrder,
        created_by: user.id,
        // New fields
        duration_days: duration_days ? parseInt(duration_days) : undefined,
        is_milestone: is_milestone || false
      })
      .select()
      .single();

    if (taskError) {
      return errorResponse(taskError.message, 500);
    }

    // 2. Create Dependencies if provided
    if (predecessors && Array.isArray(predecessors) && predecessors.length > 0) {
      const dependencyInserts = predecessors.map((predId: string) => ({
        source_task_id: predId,
        target_task_id: task.id,
        dependency_type: 'finish_to_start', // Default
        lag_days: 0
      }));

      const { error: depsError } = await supabaseAdmin
        .from('schedule_dependencies')
        .insert(dependencyInserts);
      
      if (depsError) {
        console.error('Error creating dependencies:', depsError);
        // Non-fatal, task created
      }
    }

    return successResponse({ data: task });
  } catch (error) {
    return errorResponse('Invalid request', 400);
  }
});
