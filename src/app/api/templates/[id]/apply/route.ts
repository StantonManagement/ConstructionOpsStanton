import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * POST /api/templates/[id]/apply
 * Apply template to multiple locations
 */
export const POST = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const { location_ids } = body;

    if (!location_ids || !Array.isArray(location_ids) || location_ids.length === 0) {
      throw new APIError('location_ids array is required', 400, 'VALIDATION_ERROR');
    }

    // 1. Fetch template tasks
    const { data: templateTasks, error: tasksError } = await supabaseAdmin
      .from('template_tasks')
      .select('*')
      .eq('template_id', id)
      .order('sort_order');

    if (tasksError) {
      throw new APIError(`Failed to fetch template tasks: ${tasksError.message}`, 500, 'DATABASE_ERROR');
    }

    if (!templateTasks || templateTasks.length === 0) {
      return successResponse({ created_count: 0, message: 'Template has no tasks' });
    }

    // 2. Prepare tasks for insertion
    const tasksToInsert: any[] = [];
    const timestamp = new Date().toISOString();

    for (const locationId of location_ids) {
      for (const tTask of templateTasks) {
        tasksToInsert.push({
          location_id: locationId,
          name: tTask.name,
          description: tTask.description,
          status: 'not_started',
          priority: 'medium', // Default
          budget_category_id: tTask.default_budget_category_id,
          estimated_cost: tTask.estimated_cost,
          duration_days: tTask.default_duration_days,
          sort_order: tTask.sort_order,
          tenant_id: '00000000-0000-0000-0000-000000000001',
          created_at: timestamp,
          updated_at: timestamp
        });
      }
    }

    // 3. Bulk insert tasks
    // Supabase JS insert can handle arrays
    const { data: createdTasks, error: insertError } = await supabaseAdmin
      .from('tasks')
      .insert(tasksToInsert)
      .select('id, location_id, sort_order');

    if (insertError) {
      console.error('[Apply Template API] Task insert error:', insertError);
      throw new APIError(insertError.message, 500, 'DATABASE_ERROR');
    }

    // 3b. Create Dependencies
    // We need to map sort_order to task_id for each location to establish relationships
    if (createdTasks && createdTasks.length > 0) {
      const dependenciesToInsert: any[] = [];
      
      // Build a map: location_id -> { sort_order -> task_id }
      const tasksByLocation = new Map<string, Map<number, string>>();
      
      for (const task of createdTasks) {
        if (!tasksByLocation.has(task.location_id)) {
          tasksByLocation.set(task.location_id, new Map());
        }
        tasksByLocation.get(task.location_id)?.set(task.sort_order, task.id);
      }

      // Identify dependency rules from template
      // Rule: Task with sort_order X depends on task with sort_order Y
      const dependencyRules = templateTasks
        .filter((tt: any) => tt.depends_on_sort_order !== null && tt.depends_on_sort_order !== undefined)
        .map((tt: any) => ({
          dependentSortOrder: tt.sort_order,
          prerequisiteSortOrder: tt.depends_on_sort_order
        }));

      // Generate dependency records for each location
      for (const [locationId, sortOrderMap] of tasksByLocation.entries()) {
        for (const rule of dependencyRules) {
          const dependentTaskId = sortOrderMap.get(rule.dependentSortOrder);
          const prerequisiteTaskId = sortOrderMap.get(rule.prerequisiteSortOrder);

          if (dependentTaskId && prerequisiteTaskId) {
            dependenciesToInsert.push({
              task_id: dependentTaskId,
              depends_on_task_id: prerequisiteTaskId
            });
          }
        }
      }

      // Bulk insert dependencies
      if (dependenciesToInsert.length > 0) {
        const { error: depInsertError } = await supabaseAdmin
          .from('task_dependencies')
          .insert(dependenciesToInsert);
          
        if (depInsertError) {
          console.error('[Apply Template API] Dependency insert error:', depInsertError);
          // Don't fail the whole request, but log it
        }
      }
    }

    // 4. Update locations with template_applied_id
    const { error: updateError } = await supabaseAdmin
      .from('components')
      .update({ 
        template_applied_id: id,
        updated_at: timestamp
      })
      .in('id', location_ids);

    if (updateError) {
      console.warn('[Apply Template API] Location update warning:', updateError);
      // Not critical enough to fail the request if tasks were created
    }

    return successResponse({ 
      created_count: tasksToInsert.length,
      locations_affected: location_ids.length
    });

  } catch (error) {
    console.error('[Apply Template API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to apply template', 500, 'INTERNAL_ERROR');
  }
});
