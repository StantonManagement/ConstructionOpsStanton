import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * Auto-generation summary interface
 */
interface AutoGenSummary {
  trigger_type: string;
  projects_affected: number;
  items_created: number;
}

/**
 * POST /api/action-items/auto-generate
 * Trigger auto-generation of action items based on project conditions
 *
 * This endpoint calls the database function that checks all projects for:
 * - Budget overspending (>80% spent, <70% complete)
 * - Overdue tasks (>3 days past scheduled_end)
 * - Missing documentation (no photos in 7 days)
 * - Pending payment applications (>3 days old)
 * - Upcoming milestones (within 14 days)
 */
export const POST = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    console.log('[Auto-Generate API] Starting auto-generation process...');

    // Call the master auto-generation function
    const { data: summary, error: functionError } = await supabaseAdmin
      .rpc('auto_generate_all_action_items');

    if (functionError) {
      console.error('[Auto-Generate API] Function error:', functionError);
      throw new APIError(
        functionError.message || 'Failed to run auto-generation',
        500,
        'DATABASE_ERROR'
      );
    }

    // Parse and format the summary
    const summaryData: AutoGenSummary[] = summary || [];

    const totalItemsCreated = summaryData.reduce(
      (sum, item) => sum + (item.items_created || 0),
      0
    );

    const totalProjectsAffected = summaryData.reduce(
      (sum, item) => sum + (item.projects_affected || 0),
      0
    );

    // Build detailed breakdown
    const breakdown = summaryData.map((item) => ({
      trigger: item.trigger_type,
      projectsAffected: item.projects_affected,
      itemsCreated: item.items_created,
    }));

    console.log(
      `[Auto-Generate API] Completed: ${totalItemsCreated} items created across ${totalProjectsAffected} projects`
    );

    return successResponse({
      message: 'Auto-generation completed successfully',
      summary: {
        totalItemsCreated,
        totalProjectsAffected,
        breakdown,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Auto-Generate API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to auto-generate action items', 500, 'INTERNAL_ERROR');
  }
});

/**
 * GET /api/action-items/auto-generate
 * Get information about auto-generated action items
 */
export const GET = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    // Get all auto-generated action items from the last 7 days
    const { data: autoItems, error: itemsError } = await supabaseAdmin
      .from('action_items')
      .select(`
        id,
        title,
        description,
        project_id,
        priority,
        type,
        status,
        source,
        auto_trigger,
        created_at,
        projects (
          id,
          name,
          current_phase
        )
      `)
      .eq('source', 'auto')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (itemsError) {
      console.error('[Auto-Generate API] Query error:', itemsError);
      throw new APIError(itemsError.message || 'Failed to fetch auto-generated items', 500, 'DATABASE_ERROR');
    }

    // Group by trigger type
    const byTrigger: Record<string, typeof autoItems> = {};
    autoItems?.forEach((item) => {
      const trigger = item.auto_trigger || 'unknown';
      if (!byTrigger[trigger]) {
        byTrigger[trigger] = [];
      }
      byTrigger[trigger].push(item);
    });

    // Calculate statistics
    const stats = {
      total: autoItems?.length || 0,
      byTrigger: Object.entries(byTrigger).map(([trigger, items]) => ({
        trigger,
        count: items.length,
        openCount: items.filter((i) => i.status === 'open').length,
        resolvedCount: items.filter((i) => i.status === 'resolved').length,
      })),
      byStatus: {
        open: autoItems?.filter((i) => i.status === 'open').length || 0,
        in_progress: autoItems?.filter((i) => i.status === 'in_progress').length || 0,
        resolved: autoItems?.filter((i) => i.status === 'resolved').length || 0,
        deferred: autoItems?.filter((i) => i.status === 'deferred').length || 0,
      },
    };

    return successResponse({
      items: autoItems || [],
      stats,
      period: 'last_7_days',
    });
  } catch (error) {
    console.error('[Auto-Generate API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch auto-generated items', 500, 'INTERNAL_ERROR');
  }
});
