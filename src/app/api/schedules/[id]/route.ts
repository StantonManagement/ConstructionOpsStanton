import { NextResponse, NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse } from '@/lib/apiHelpers';
import { supabaseAdmin } from '@/lib/supabaseClient';

export const GET = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  
  if (!supabaseAdmin) {
    return errorResponse('Server misconfigured', 500);
  }

  // 1. Fetch Schedule
  const { data: schedule, error: scheduleError } = await supabaseAdmin
    .from('project_schedules')
    .select('*, projects(name)')
    .eq('id', id)
    .single();

  if (scheduleError || !schedule) {
    return errorResponse('Schedule not found', 404);
  }

  // 2. Fetch Tasks
  const { data: tasks, error: tasksError } = await supabaseAdmin
    .from('schedule_tasks')
    .select(`
      *,
      contractors(name)
    `)
    .eq('schedule_id', id)
    .order('sort_order', { ascending: true });

  if (tasksError) {
    return errorResponse(tasksError.message, 500);
  }

  // 3. Fetch Dependencies
  let validDependencies: any[] = [];
  if (tasks && tasks.length > 0) {
     const taskIds = tasks.map((t: any) => t.id);
     const { data: deps } = await supabaseAdmin
       .from('schedule_dependencies')
       .select('*')
       .in('source_task_id', taskIds);
     
     if (deps) validDependencies = deps;
  }

  // 4. Fetch Milestones
  const { data: milestones, error: milesError } = await supabaseAdmin
    .from('schedule_milestones')
    .select('*')
    .eq('schedule_id', id)
    .order('target_date', { ascending: true });

  return successResponse({
    data: {
      schedule,
      tasks: tasks?.map((t: any) => ({
        ...t,
        contractor_name: t.contractors?.name,
        dependencies: validDependencies
          .filter(d => d.target_task_id === t.id) // Predecessors for this task
          .map(d => d.source_task_id)
      })),
      dependencies: validDependencies,
      milestones: milestones || []
    }
  });
});

export const DELETE = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  if (!supabaseAdmin) {
    return errorResponse('Server misconfigured', 500);
  }

  const { error } = await supabaseAdmin
    .from('project_schedules')
    .delete()
    .eq('id', id);

  if (error) {
    return errorResponse(error.message, 500);
  }

  return successResponse({ success: true });
});
