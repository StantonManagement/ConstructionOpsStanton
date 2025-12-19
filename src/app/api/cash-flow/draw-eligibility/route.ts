import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/cash-flow/draw-eligibility
 * Get current draw eligibility based on verified tasks
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id') ?? searchParams.get('property_id');

    if (!projectId) {
      throw new APIError('project_id is required', 400, 'VALIDATION_ERROR');
    }

    const projectIdInt = parseInt(projectId);

    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('name')
      .eq('id', projectIdInt)
      .maybeSingle();

    // 1. Fetch Summary from View
    const { data: summaryRows, error: summaryError } = await supabaseAdmin
      .from('draw_eligibility')
      .select('*')
      .eq('project_id', projectId);

    if (summaryError) {
      console.error('[Draw Eligibility API] Summary Error:', summaryError);
      throw new APIError('Failed to fetch draw eligibility', 500, 'DATABASE_ERROR');
    }

    // 2. Fetch Eligible Tasks (Tasks that are verified but NOT in a draw)
    // We can find tasks where verified=true AND id NOT IN (select task_id from draw_line_items)
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select(`
        id, 
        name, 
        actual_cost, 
        estimated_cost, 
        verified_at,
        locations (name),
        draw_line_items (id)
      `)
      .eq('location.project_id', projectId) // This join filter works if Supabase recognizes relationship
      .eq('status', 'verified');
      // .is('draw_line_items', null) -> Does not work directly for "not exists" usually in one go easily without exact filter
      // PostgREST filtering on embedded resource being null is tricky.
      // Better: filter in memory or use !inner join?
      // Actually, standard way: query tasks, embed draw_line_items, filter where array is empty.
    
    // Alternative: Use a raw query or better PostgREST syntax?
    // Let's try fetching verified tasks and filtering in JS for now as list shouldn't be huge.
    // Ideally we'd use a view for this too but I didn't create one for task list.
    
    // Correction: We need to filter tasks by project first. `tasks` doesn't have `project_id`. `locations` does.
    // So we need tasks -> locations.
    
    // Re-query with correct join syntax
    const { data: rawTasks, error: rawTasksError } = await supabaseAdmin
      .from('tasks')
      .select(`
        id,
        name,
        actual_cost,
        estimated_cost,
        verified_at,
        location:locations!inner (
          id,
          name,
          project_id
        ),
        draw_line_items (id)
      `)
      .eq('location.project_id', projectId)
      .eq('status', 'verified');

    if (rawTasksError) {
        console.error('[Draw Eligibility API] Tasks Error:', rawTasksError);
        throw new APIError('Failed to fetch eligible tasks', 500, 'DATABASE_ERROR');
    }

    // Filter tasks that have NO draw_line_items
    const eligibleTasks = rawTasks?.filter((t: any) => !t.draw_line_items || t.draw_line_items.length === 0).map((t: any) => ({
        task_id: t.id,
        task_name: t.name,
        location_name: t.location?.name,
        cost: t.actual_cost || t.estimated_cost || 0,
        verified_at: t.verified_at
    })) || [];

    // Aggregates
    let totalVerifiedCost = 0;
    let totalAlreadyDrawn = 0;
    let totalEligible = 0;
    const byCategory: any[] = [];

    summaryRows?.forEach((row: any) => {
        totalVerifiedCost += parseFloat(row.verified_cost);
        totalAlreadyDrawn += parseFloat(row.already_drawn);
        totalEligible += parseFloat(row.eligible_to_draw);
        
        byCategory.push({
            category: row.budget_category,
            verified_cost: parseFloat(row.verified_cost),
            already_drawn: parseFloat(row.already_drawn),
            eligible: parseFloat(row.eligible_to_draw),
            verified_task_count: row.verified_task_count
        });
    });

    return successResponse({
      project_id: projectId,
      property_name: project?.name || null,
      total_verified_cost: totalVerifiedCost,
      total_already_drawn: totalAlreadyDrawn,
      total_eligible: totalEligible,
      by_category: byCategory,
      eligible_tasks: eligibleTasks
    });

  } catch (error) {
    console.error('[Draw Eligibility API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch draw eligibility', 500, 'INTERNAL_ERROR');
  }
});
