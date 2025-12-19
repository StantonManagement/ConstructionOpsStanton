import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/properties/[id]/stats
 * Alias of /api/projects/[id]/stats for PRP compatibility.
 * This codebase uses numeric project IDs as the property identifier.
 */
export const GET = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      throw new APIError('Invalid property ID', 400, 'VALIDATION_ERROR');
    }

    const { data: stats, error } = await supabaseAdmin
      .from('project_stats')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return successResponse({
          project_id: projectId,
          total_locations: 0,
          complete_locations: 0,
          blocked_locations: 0,
          total_tasks: 0,
          verified_tasks: 0,
          total_estimated_cost: 0,
          verified_cost: 0,
          completion_percentage: 0,
        });
      }
      console.error('[Property Stats API] Error:', error);
      throw new APIError('Failed to fetch property stats', 500, 'DATABASE_ERROR');
    }

    return successResponse(stats);
  } catch (error) {
    console.error('[Property Stats API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch property stats', 500, 'INTERNAL_ERROR');
  }
});
