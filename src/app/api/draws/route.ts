import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/draws
 * List draws for a project
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      throw new APIError('project_id is required', 400, 'VALIDATION_ERROR');
    }

    const { data, error } = await supabaseAdmin
      .from('construction_draws')
      .select('*')
      .eq('project_id', projectId)
      .order('draw_number', { ascending: false });

    if (error) {
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to list draws', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/draws
 * Create a new draft draw
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const { project_id, notes } = body;

    if (!project_id) {
      throw new APIError('project_id is required', 400, 'VALIDATION_ERROR');
    }

    // Get next draw number
    const { data: maxDraw, error: maxError } = await supabaseAdmin
      .from('construction_draws')
      .select('draw_number')
      .eq('project_id', project_id)
      .order('draw_number', { ascending: false })
      .limit(1)
      .single();

    // If no draws, start at 1. If error implies no rows, also 1.
    // Actually .single() returns error if no rows.
    let nextNumber = 1;
    if (maxDraw) {
        nextNumber = maxDraw.draw_number + 1;
    } else if (maxError && maxError.code !== 'PGRST116') {
        // Real error
        throw new APIError('Failed to determine draw number', 500, 'DATABASE_ERROR');
    }

    const { data, error } = await supabaseAdmin
      .from('construction_draws')
      .insert([{
        project_id,
        draw_number: nextNumber,
        status: 'draft',
        amount_requested: 0,
        notes,
        tenant_id: '00000000-0000-0000-0000-000000000001'
      }])
      .select()
      .single();

    if (error) {
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data, 201);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to create draw', 500, 'INTERNAL_ERROR');
  }
});
