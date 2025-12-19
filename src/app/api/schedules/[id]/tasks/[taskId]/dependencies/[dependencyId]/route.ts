import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse } from '@/lib/apiHelpers';
import { cascadeTaskUpdates } from '@/lib/scheduling/cascade';

// DELETE - Remove a dependency
export const DELETE = withAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string; dependencyId: string }> }
) => {
  const { id: scheduleId, taskId, dependencyId } = await params;

  if (!supabaseAdmin) {
    return errorResponse('Server misconfigured', 500);
  }

  try {
    // Verify the dependency exists and belongs to this task
    const { data: dependency, error: fetchError } = await supabaseAdmin
      .from('schedule_dependencies')
      .select('id, source_task_id, target_task_id')
      .eq('id', dependencyId)
      .eq('target_task_id', taskId)
      .single();

    if (fetchError || !dependency) {
      return errorResponse('Dependency not found', 404);
    }

    // Delete the dependency
    const { error: deleteError } = await supabaseAdmin
      .from('schedule_dependencies')
      .delete()
      .eq('id', dependencyId);

    if (deleteError) throw deleteError;

    return successResponse({ message: 'Dependency removed successfully' });
  } catch (error: any) {
    console.error('Error deleting dependency:', error);
    return errorResponse(error.message || 'Failed to delete dependency', 500);
  }
});

// PUT - Update a dependency (change type or lag)
export const PUT = withAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string; dependencyId: string }> }
) => {
  const { id: scheduleId, taskId, dependencyId } = await params;

  if (!supabaseAdmin) {
    return errorResponse('Server misconfigured', 500);
  }

  try {
    const body = await request.json();
    const { dependency_type, lag_days } = body;

    // Validate dependency type if provided
    if (dependency_type) {
      const validTypes = ['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'];
      if (!validTypes.includes(dependency_type)) {
        return errorResponse(`Invalid dependency_type. Must be one of: ${validTypes.join(', ')}`, 400);
      }
    }

    // Build update object
    const updateData: Record<string, any> = {};
    if (dependency_type !== undefined) updateData.dependency_type = dependency_type;
    if (lag_days !== undefined) updateData.lag_days = parseInt(lag_days) || 0;

    if (Object.keys(updateData).length === 0) {
      return errorResponse('No fields to update', 400);
    }

    // Update the dependency
    const { data: dependency, error: updateError } = await supabaseAdmin
      .from('schedule_dependencies')
      .update(updateData)
      .eq('id', dependencyId)
      .eq('target_task_id', taskId)
      .select()
      .single();

    if (updateError) throw updateError;

    if (!dependency) {
      return errorResponse('Dependency not found', 404);
    }

    // Trigger cascade update if the dependency changed
    // Get the predecessor's end date to recalculate
    const { data: predecessorTask } = await supabaseAdmin
      .from('schedule_tasks')
      .select('end_date, schedule_id')
      .eq('id', dependency.source_task_id)
      .single();

    if (predecessorTask) {
      await cascadeTaskUpdates(
        supabaseAdmin,
        dependency.source_task_id,
        predecessorTask.end_date,
        predecessorTask.schedule_id
      );
    }

    return successResponse({ data: dependency });
  } catch (error: any) {
    console.error('Error updating dependency:', error);
    return errorResponse(error.message || 'Failed to update dependency', 500);
  }
});
