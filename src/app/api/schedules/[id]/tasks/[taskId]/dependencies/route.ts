import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse } from '@/lib/apiHelpers';

// POST - Add a new dependency
export const POST = withAuth(async (
  request: NextRequest, 
  { params }: { params: Promise<{ id: string; taskId: string }> }
) => {
  const { id: scheduleId, taskId } = await params;
  
  if (!supabaseAdmin) {
    return errorResponse('Server misconfigured', 500);
  }

  try {
    const body = await request.json();
    const { predecessor_id, dependency_type = 'finish_to_start', lag_days = 0 } = body;

    if (!predecessor_id) {
      return errorResponse('predecessor_id is required', 400);
    }

    // Validate dependency type
    const validTypes = ['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'];
    if (!validTypes.includes(dependency_type)) {
      return errorResponse(`Invalid dependency_type. Must be one of: ${validTypes.join(', ')}`, 400);
    }

    // Prevent self-dependency
    if (predecessor_id === taskId) {
      return errorResponse('A task cannot depend on itself', 400);
    }

    // Verify both tasks exist and belong to the same schedule
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('schedule_tasks')
      .select('id, schedule_id')
      .in('id', [taskId, predecessor_id])
      .eq('schedule_id', scheduleId);

    if (tasksError) throw tasksError;

    if (!tasks || tasks.length !== 2) {
      return errorResponse('One or both tasks not found in this schedule', 404);
    }

    // Check for circular dependency
    const hasCircular = await checkCircularDependency(
      supabaseAdmin,
      predecessor_id,
      taskId,
      scheduleId
    );

    if (hasCircular) {
      return errorResponse('Adding this dependency would create a circular reference', 400);
    }

    // Insert the dependency
    const { data: dependency, error: insertError } = await supabaseAdmin
      .from('schedule_dependencies')
      .insert({
        source_task_id: predecessor_id,
        target_task_id: taskId,
        dependency_type,
        lag_days: parseInt(lag_days) || 0,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        return errorResponse('This dependency already exists', 409);
      }
      throw insertError;
    }

    return successResponse({ data: dependency }, 201);
  } catch (error: any) {
    console.error('Error creating dependency:', error);
    return errorResponse(error.message || 'Failed to create dependency', 500);
  }
});

// GET - List all dependencies for a task
export const GET = withAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) => {
  const { id: scheduleId, taskId } = await params;

  if (!supabaseAdmin) {
    return errorResponse('Server misconfigured', 500);
  }

  try {
    // Get dependencies where this task is the target (predecessors)
    const { data: predecessors, error: predError } = await supabaseAdmin
      .from('schedule_dependencies')
      .select(`
        id,
        source_task_id,
        dependency_type,
        lag_days,
        predecessor:schedule_tasks!source_task_id (
          id,
          task_name,
          start_date,
          end_date,
          status
        )
      `)
      .eq('target_task_id', taskId);

    if (predError) throw predError;

    // Get dependencies where this task is the source (successors)
    const { data: successors, error: succError } = await supabaseAdmin
      .from('schedule_dependencies')
      .select(`
        id,
        target_task_id,
        dependency_type,
        lag_days,
        successor:schedule_tasks!target_task_id (
          id,
          task_name,
          start_date,
          end_date,
          status
        )
      `)
      .eq('source_task_id', taskId);

    if (succError) throw succError;

    return successResponse({
      predecessors: predecessors || [],
      successors: successors || [],
    });
  } catch (error: any) {
    console.error('Error fetching dependencies:', error);
    return errorResponse(error.message || 'Failed to fetch dependencies', 500);
  }
});

/**
 * Check if adding a dependency from predecessorId to successorId would create a cycle.
 * Uses DFS to traverse from the proposed successor to see if we can reach the predecessor.
 */
async function checkCircularDependency(
  supabase: typeof supabaseAdmin,
  predecessorId: string,
  successorId: string,
  scheduleId: string
): Promise<boolean> {
  if (!supabase) return false;

  const visited = new Set<string>();
  const stack = [successorId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    
    if (current === predecessorId) {
      // Found a path back to the predecessor - would create cycle
      return true;
    }

    if (visited.has(current)) continue;
    visited.add(current);

    // Get all tasks that depend on the current task (where current is predecessor)
    const { data: deps, error } = await supabase
      .from('schedule_dependencies')
      .select('target_task_id')
      .eq('source_task_id', current);

    if (error) {
      console.error('Error checking circular dependency:', error);
      continue;
    }

    if (deps) {
      for (const dep of deps) {
        if (!visited.has(dep.target_task_id)) {
          stack.push(dep.target_task_id);
        }
      }
    }
  }

  return false;
}
