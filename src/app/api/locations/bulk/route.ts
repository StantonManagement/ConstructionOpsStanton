import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * POST /api/locations/bulk
 * Bulk create locations
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const { 
      project_id, 
      start_number, 
      end_number, 
      prefix = 'Unit ', 
      type = 'unit', 
      unit_type, 
      floor,
      template_id 
    } = body;

    // Validation
    if (!project_id) throw new APIError('project_id is required', 400, 'VALIDATION_ERROR');
    if (start_number === undefined || end_number === undefined) {
      throw new APIError('start_number and end_number are required', 400, 'VALIDATION_ERROR');
    }
    if (start_number > end_number) {
      throw new APIError('start_number must be less than or equal to end_number', 400, 'VALIDATION_ERROR');
    }
    
    // Cap bulk creation to reasonable limit (e.g. 100)
    if (end_number - start_number > 100) {
      throw new APIError('Cannot create more than 100 locations at once', 400, 'VALIDATION_ERROR');
    }

    const locationsToInsert = [];
    const timestamp = new Date().toISOString();

    for (let i = start_number; i <= end_number; i++) {
      locationsToInsert.push({
        project_id,
        name: `${prefix}${i}`,
        type,
        unit_type,
        unit_number: i.toString(),
        floor,
        status: 'not_started',
        tenant_id: '00000000-0000-0000-0000-000000000001',
        created_at: timestamp,
        updated_at: timestamp
      });
    }

    // Insert locations
    const { data: createdLocations, error: insertError } = await supabaseAdmin
      .from('locations')
      .insert(locationsToInsert)
      .select('id');

    if (insertError) {
      console.error('[Bulk Locations API] Insert error:', insertError);
      throw new APIError(insertError.message, 500, 'DATABASE_ERROR');
    }

    const createdIds = createdLocations?.map(l => l.id) || [];

    // Apply template if provided
    let tasksCreatedCount = 0;
    if (template_id && createdIds.length > 0) {
      try {
        // We can reuse the apply logic internally or call the endpoint
        // Reusing internal logic is safer and faster
        
        // 1. Fetch template tasks
        const { data: templateTasks } = await supabaseAdmin
          .from('template_tasks')
          .select('*')
          .eq('template_id', template_id)
          .order('sort_order');

        if (templateTasks && templateTasks.length > 0) {
          const tasksToInsert: any[] = [];
          
          for (const locationId of createdIds) {
            for (const tTask of templateTasks) {
              tasksToInsert.push({
                location_id: locationId,
                name: tTask.name,
                description: tTask.description,
                status: 'not_started',
                priority: 'medium',
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

          const { error: taskInsertError } = await supabaseAdmin
            .from('tasks')
            .insert(tasksToInsert);
          
          if (!taskInsertError) {
            tasksCreatedCount = tasksToInsert.length;
            
            // Update locations with template_applied_id
            await supabaseAdmin
              .from('locations')
              .update({ template_applied_id: template_id })
              .in('id', createdIds);

            // Create Dependencies
            // We need to map sort_order to task_id for each location to establish relationships
            // First, fetch the created tasks to get their IDs
            const { data: createdTasks } = await supabaseAdmin
              .from('tasks')
              .select('id, location_id, sort_order')
              .in('location_id', createdIds);

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
                  console.error('[Bulk Locations API] Dependency insert error:', depInsertError);
                }
              }
            }
          } else {
             console.error('[Bulk Locations API] Task generation failed:', taskInsertError);
          }
        }
      } catch (err) {
        console.error('[Bulk Locations API] Template application error:', err);
        // Don't fail the whole request, just return locations
      }
    }

    return successResponse({
      created_count: createdIds.length,
      location_ids: createdIds,
      tasks_created: tasksCreatedCount
    }, 201);

  } catch (error) {
    console.error('[Bulk Locations API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to create locations', 500, 'INTERNAL_ERROR');
  }
});
