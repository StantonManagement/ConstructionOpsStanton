import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  errorResponse, 
  APIError 
} from '@/lib/apiHelpers';

/**
 * GET /api/projects/[id]/schedule-with-budget
 * Returns schedule tasks grouped by budget category
 */
export const GET = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const projectId = parseInt(params.id);

    if (isNaN(projectId)) {
      throw new APIError('Invalid project ID', 400, 'VALIDATION_ERROR');
    }

    // 1. Fetch Project Schedule
    const { data: schedule, error: scheduleError } = await supabaseAdmin
      .from('project_schedules')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (scheduleError && scheduleError.code !== 'PGRST116') { // PGRST116 is "No rows found"
      console.error('[Schedule API] Error fetching schedule:', scheduleError);
      throw new APIError('Failed to fetch schedule', 500, 'DATABASE_ERROR');
    }

    // If no schedule exists, return empty structure
    if (!schedule) {
      return successResponse({
        schedule: null,
        budgetCategories: [],
        unassignedTasks: []
      });
    }

    // 2. Fetch Tasks for this schedule with dependencies
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('schedule_tasks')
      .select(`
        *,
        contractors:contractor_id(id, name),
        dependencies:schedule_dependencies!target_task_id(source_task_id)
      `)
      .eq('schedule_id', schedule.id)
      .order('start_date', { ascending: true });

    if (tasksError) {
      console.error('[Schedule API] Error fetching tasks:', tasksError);
      throw new APIError('Failed to fetch tasks', 500, 'DATABASE_ERROR');
    }

    // Flatten dependencies from [{source_task_id: "uuid"}] to ["uuid"]
    const tasksWithDependencies = tasks.map(task => ({
      ...task,
      dependencies: task.dependencies ? task.dependencies.map((d: any) => d.source_task_id) : []
    }));

    // 3. Fetch Budget Categories for this project
    const { data: budgetCategories, error: budgetError } = await supabaseAdmin
      .from('property_budgets')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('id', { ascending: true });

    if (budgetError) {
      console.error('[Schedule API] Error fetching budget categories:', budgetError);
      throw new APIError('Failed to fetch budget categories', 500, 'DATABASE_ERROR');
    }

    // 4. Group tasks by budget category
    const tasksByBudget = new Map<number, any[]>();
    const unassignedTasks: any[] = [];

    // Initialize map with empty arrays for all categories
    budgetCategories?.forEach(category => {
      tasksByBudget.set(category.id, []);
    });

    // Distribute tasks
    tasksWithDependencies?.forEach(task => {
      const formattedTask = {
        ...task,
        contractor_name: task.contractors?.name || null
      };

      if (task.budget_category_id && tasksByBudget.has(task.budget_category_id)) {
        tasksByBudget.get(task.budget_category_id)?.push(formattedTask);
      } else {
        unassignedTasks.push(formattedTask);
      }
    });

    // Format response
    const budgetCategoriesWithTasks = budgetCategories?.map(category => ({
      ...category,
      tasks: tasksByBudget.get(category.id) || []
    }));

    return successResponse({
      schedule,
      budgetCategories: budgetCategoriesWithTasks,
      unassignedTasks
    });

  } catch (error) {
    console.error('[Schedule API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch schedule with budget', 500, 'INTERNAL_ERROR');
  }
});

