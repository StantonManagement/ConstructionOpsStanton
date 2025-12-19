import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/tasks
 * List tasks, filtered by location_id
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get('location_id');

    if (!locationId) {
      throw new APIError('location_id is required', 400, 'VALIDATION_ERROR');
    }

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select(`
        *,
        contractors (name)
      `)
      .eq('location_id', locationId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Tasks API] Fetch error:', error);
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    // Transform to flatten contractor name if needed or keep as is
    // The type definition has contractor?: { name: string } so this matches.

    return successResponse(data || []);
  } catch (error) {
    console.error('[Tasks API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch tasks', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/tasks
 * Create a new task
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const { 
      location_id, 
      name, 
      description,
      status = 'not_started',
      priority = 'medium',
      assigned_contractor_id,
      budget_category_id,
      estimated_cost,
      duration_days,
      scheduled_start,
      scheduled_end
    } = body;

    // Validation
    if (!location_id) throw new APIError('location_id is required', 400, 'VALIDATION_ERROR');
    if (!name?.trim()) throw new APIError('name is required', 400, 'VALIDATION_ERROR');

    // Get max sort_order to append to end
    const { data: maxOrderData, error: maxOrderError } = await supabaseAdmin
      .from('tasks')
      .select('sort_order')
      .eq('location_id', location_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = maxOrderData ? (maxOrderData.sort_order || 0) + 1 : 0;

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .insert([{
        location_id,
        name: name.trim(),
        description,
        status,
        priority,
        assigned_contractor_id,
        budget_category_id,
        estimated_cost,
        duration_days,
        scheduled_start,
        scheduled_end,
        sort_order: nextSortOrder,
        tenant_id: '00000000-0000-0000-0000-000000000001'
      }])
      .select()
      .single();

    if (error) {
      console.error('[Tasks API] Insert error:', error);
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data, 201);
  } catch (error) {
    console.error('[Tasks API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to create task', 500, 'INTERNAL_ERROR');
  }
});
