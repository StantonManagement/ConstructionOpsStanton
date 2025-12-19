import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/tasks/[id]/dependencies
 * List dependencies for a task
 */
export const GET = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('task_dependencies')
      .select(`
        id,
        depends_on_task:tasks!depends_on_task_id (
          id,
          name,
          status,
          scheduled_end
        )
      `)
      .eq('task_id', id);

    if (error) {
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch dependencies', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/tasks/[id]/dependencies
 * Add a dependency
 */
export const POST = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const admin = supabaseAdmin;

    const { id: taskId } = await params;
    const body = await request.json();
    const { depends_on_task_id } = body;

    if (!depends_on_task_id) {
      throw new APIError('depends_on_task_id is required', 400, 'VALIDATION_ERROR');
    }

    if (taskId === depends_on_task_id) {
      throw new APIError('Task cannot depend on itself', 400, 'VALIDATION_ERROR');
    }

    const hasPath = async (startId: string, targetId: string) => {
      const visited = new Set<string>();
      const stack: string[] = [startId];

      while (stack.length > 0) {
        const current = stack.pop()!;
        if (current === targetId) return true;
        if (visited.has(current)) continue;
        visited.add(current);

        const { data: edges, error: edgesError } = await admin
          .from('task_dependencies')
          .select('depends_on_task_id')
          .eq('task_id', current);

        if (edgesError) continue;
        edges?.forEach((e: any) => {
          if (e.depends_on_task_id) stack.push(e.depends_on_task_id);
        });

        if (visited.size > 2000) return false;
      }

      return false;
    };

    if (await hasPath(depends_on_task_id, taskId)) {
      throw new APIError('Circular dependency detected', 400, 'VALIDATION_ERROR');
    }

    // Validate tasks exist and are in same location (business rule)
    const { data: tasks, error: fetchError } = await admin
      .from('tasks')
      .select('id, location_id')
      .in('id', [taskId, depends_on_task_id]);

    if (fetchError || !tasks || tasks.length !== 2) {
      throw new APIError('One or both tasks not found', 404, 'NOT_FOUND');
    }

    const task1 = tasks.find(t => t.id === taskId);
    const task2 = tasks.find(t => t.id === depends_on_task_id);

    if (task1?.location_id !== task2?.location_id) {
      throw new APIError('Dependencies must be within the same location', 400, 'VALIDATION_ERROR');
    }

    const { data, error } = await admin
      .from('task_dependencies')
      .insert([{
        task_id: taskId,
        depends_on_task_id: depends_on_task_id
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new APIError('Dependency already exists', 400, 'VALIDATION_ERROR');
      }
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data, 201);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to add dependency', 500, 'INTERNAL_ERROR');
  }
});

/**
 * DELETE /api/tasks/[id]/dependencies
 * Remove a dependency
 */
export const DELETE = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id: taskId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const dependsOnTaskId = searchParams.get('depends_on_task_id');

    if (!dependsOnTaskId) {
      throw new APIError('depends_on_task_id is required', 400, 'VALIDATION_ERROR');
    }

    const { error } = await supabaseAdmin
      .from('task_dependencies')
      .delete()
      .eq('task_id', taskId)
      .eq('depends_on_task_id', dependsOnTaskId);

    if (error) {
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to remove dependency', 500, 'INTERNAL_ERROR');
  }
});
