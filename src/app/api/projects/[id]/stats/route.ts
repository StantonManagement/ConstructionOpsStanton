import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/projects/[id]/stats
 * Returns aggregated stats for a project using the project_stats view
 */
export const GET = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;
    const projectId = parseInt(id);

    if (isNaN(projectId)) {
      throw new APIError('Invalid project ID', 400, 'VALIDATION_ERROR');
    }

    // Query the project_stats view
    const { data: stats, error } = await supabaseAdmin
      .from('project_stats')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error) {
      // If view returns no rows (e.g. project has no locations yet), return zeros
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
            completion_percentage: 0
         });
      }
      console.error('[Project Stats API] Error:', error);
      throw new APIError('Failed to fetch project stats', 500, 'DATABASE_ERROR');
    }

    return successResponse(stats);

  } catch (error) {
    console.error('[Project Stats API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch project stats', 500, 'INTERNAL_ERROR');
  }
});
