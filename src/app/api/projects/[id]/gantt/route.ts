import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { successResponse, errorResponse } from '@/lib/apiHelpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // 1. Get the schedule ID for this project
    const { data: schedule, error: scheduleError } = await supabaseAdmin!
      .from('project_schedules')
      .select('id')
      .eq('project_id', projectId)
      .single();

    if (scheduleError || !schedule) {
      // If no schedule, return empty structure
      return successResponse({ tasks: [] });
    }

    // 2. Get all tasks
    const { data: tasks, error: tasksError } = await supabaseAdmin!
      .from('schedule_tasks')
      .select(`
        id,
        task_name,
        start_date,
        end_date,
        progress,
        status,
        budget_category_id,
        sort_order,
        is_milestone
      `)
      .eq('schedule_id', schedule.id)
      .order('sort_order', { ascending: true });

    if (tasksError) throw tasksError;

    // 3. Get all dependencies
    const { data: dependencies, error: depsError } = await supabaseAdmin!
      .from('schedule_dependencies')
      .select('source_task_id, target_task_id, dependency_type, lag_days')
      .in('target_task_id', tasks.map(t => t.id));

    if (depsError) throw depsError;

    // 4. Format for frappe-gantt (or generic Gantt)
    // frappe-gantt expects: id, name, start, end, progress, dependencies (comma sep ids), custom_class
    const formattedTasks = tasks.map(task => {
      // Find predecessors for this task (where this task is the target)
      const taskDeps = dependencies.filter(d => d.target_task_id === task.id);
      const dependencyIds = taskDeps.map(d => d.source_task_id).join(', ');

      // Build custom_class without trailing spaces
      const customClasses = [`status-${task.status}`];
      if (task.is_milestone) {
        customClasses.push('milestone');
      }

      return {
        id: task.id,
        name: task.task_name,
        start: task.start_date,
        end: task.end_date,
        progress: task.progress || 0,
        dependencies: dependencyIds,
        custom_class: customClasses.join(' ')
        // Extra data can be attached if needed
      };
    });

    return successResponse({ tasks: formattedTasks });
  } catch (error: any) {
    console.error('Error fetching Gantt data:', error);
    return errorResponse(error.message, 500);
  }
}
