import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/reports/trade
 * Returns task progress grouped by budget category (trade)
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const budgetCategoryId = searchParams.get('budget_category_id');

    if (!projectId) {
        throw new APIError('Project ID is required', 400, 'VALIDATION_ERROR');
    }

    // 1. Fetch Budget Categories first to have the "Trades"
    const { data: categories, error: catError } = await supabaseAdmin
        .from('property_budgets')
        .select('id, category, original_amount, revised_amount')
        .eq('project_id', projectId)
        .order('category');

    if (catError) {
        throw new APIError('Failed to fetch budget categories', 500, 'DATABASE_ERROR');
    }

    // 2. Fetch Tasks for the project (via locations)
    // We join locations to filter by project_id
    let tasksQuery = supabaseAdmin
        .from('tasks')
        .select(`
            id, 
            name, 
            status, 
            estimated_cost, 
            actual_cost, 
            budget_category_id,
            contractor:contractors(name),
            location:locations!inner(id, name, project_id)
        `)
        .eq('location.project_id', projectId);

    if (budgetCategoryId) {
        tasksQuery = tasksQuery.eq('budget_category_id', budgetCategoryId);
    }

    const { data: tasks, error: taskError } = await tasksQuery;

    if (taskError) {
        console.error('[Trade Report API] Tasks Error:', taskError);
        throw new APIError('Failed to fetch tasks', 500, 'DATABASE_ERROR');
    }

    // 3. Aggregate
    const statsByCategory = new Map<number, any>();

    // Initialize with categories
    categories?.forEach((cat: any) => {
        statsByCategory.set(cat.id, {
            category_id: cat.id,
            category_name: cat.category,
            total_tasks: 0,
            verified_tasks: 0,
            in_progress_tasks: 0,
            not_started_tasks: 0,
            total_estimated_cost: 0,
            verified_cost: 0,
            tasks: [] // Only populate if specific category requested? Or simplified list?
        });
    });

    const unassignedTasks: any[] = [];

    tasks?.forEach((task: any) => {
        const catId = task.budget_category_id;
        let stats = catId ? statsByCategory.get(catId) : null;

        if (!stats) {
             // Handle unassigned or category not found
             if (!catId) unassignedTasks.push(task);
             return; 
        }

        stats.total_tasks++;
        stats.total_estimated_cost += (task.estimated_cost || 0);

        if (task.status === 'verified') {
            stats.verified_tasks++;
            stats.verified_cost += (task.actual_cost || task.estimated_cost || 0);
        } else if (task.status === 'in_progress' || task.status === 'worker_complete') {
            stats.in_progress_tasks++;
        } else {
            stats.not_started_tasks++;
        }

        // Add task detail (simplified)
        stats.tasks.push({
            task_id: task.id,
            task_name: task.name,
            location_name: task.location?.name,
            status: task.status,
            assigned_contractor: task.contractor?.name
        });
    });

    const result = Array.from(statsByCategory.values());

    return successResponse({
        trades: result,
        unassigned_count: unassignedTasks.length
    });

  } catch (error) {
    console.error('[Trade Report API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch trade report', 500, 'INTERNAL_ERROR');
  }
});
