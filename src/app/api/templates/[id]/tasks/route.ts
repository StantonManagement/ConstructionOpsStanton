import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/templates/[id]/tasks
 * List tasks for a template
 */
export const GET = withAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { data, error } = await supabaseAdmin
      .from('template_tasks')
      .select('*')
      .eq('template_id', params.id)
      .order('sort_order');

    if (error) {
      console.error('[Template Tasks API] Fetch error:', error);
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data || []);
  } catch (error) {
    console.error('[Template Tasks API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch template tasks', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/templates/[id]/tasks
 * Add a task to a template
 */
export const POST = withAuth(async (request: NextRequest, { params }: { params: { id: string } }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      default_duration_days, 
      default_budget_category_id, 
      estimated_cost,
      sort_order,
      depends_on_sort_order
    } = body;

    if (!name?.trim()) {
      throw new APIError('Name is required', 400, 'VALIDATION_ERROR');
    }

    // Determine sort order if not provided
    let nextSortOrder = sort_order;
    if (nextSortOrder === undefined) {
      const { data: maxOrderData } = await supabaseAdmin
        .from('template_tasks')
        .select('sort_order')
        .eq('template_id', params.id)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();
      
      nextSortOrder = maxOrderData ? (maxOrderData.sort_order || 0) + 1 : 0;
    }

    const { data, error } = await supabaseAdmin
      .from('template_tasks')
      .insert([{
        template_id: params.id,
        name: name.trim(),
        description,
        default_duration_days,
        default_budget_category_id,
        estimated_cost,
        sort_order: nextSortOrder,
        depends_on_sort_order: depends_on_sort_order, // Added dependency field
        tenant_id: '00000000-0000-0000-0000-000000000001'
      }])
      .select()
      .single();

    if (error) {
      console.error('[Template Tasks API] Create error:', error);
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data, 201);
  } catch (error) {
    console.error('[Template Tasks API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to create template task', 500, 'INTERNAL_ERROR');
  }
});

/**
 * PUT /api/templates/[id]/tasks
 * Bulk reorder tasks
 */
export const PUT = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const admin = supabaseAdmin;

    const { id: templateId } = await params;
    const body = await request.json();
    const { tasks } = body; // Expects { tasks: [{ id: string, sort_order: number }] }

    if (!Array.isArray(tasks)) {
      throw new APIError('Tasks array is required', 400, 'VALIDATION_ERROR');
    }

    // Process updates in parallel
    // Note: In a real production app with many tasks, we might want to use a stored procedure or specific SQL for bulk update
    // But for template tasks (usually < 50), parallel updates are acceptable
    await Promise.all(tasks.map(task => 
      admin
        .from('template_tasks')
        .update({ sort_order: task.sort_order })
        .eq('id', task.id)
        .eq('template_id', templateId)
    ));

    return successResponse({ success: true });
  } catch (error) {
    console.error('[Template Tasks API] Reorder error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to reorder tasks', 500, 'INTERNAL_ERROR');
  }
});
