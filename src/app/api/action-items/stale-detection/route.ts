import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * Stale detection result interface
 */
interface StaleDetectionResult {
  action: 'marked' | 'unmarked';
  items_affected: number;
  details: Array<{
    id: number;
    title: string;
    project?: string;
    previous_priority?: number;
    current_priority?: number;
    days_since_change?: number;
    reason?: string;
  }>;
}

/**
 * Stale statistics interface
 */
interface StaleStats {
  total_stale: number;
  by_priority: Array<{ priority: number; count: number }>;
  by_project: Array<{ project_id: number; project_name: string; count: number }>;
  oldest_stale_days: number;
  average_stale_days: number;
}

/**
 * POST /api/action-items/stale-detection
 * Run stale item detection and marking
 *
 * This endpoint:
 * 1. Unmarks items that should no longer be stale (updated, re-prioritized, resolved)
 * 2. Marks new items as stale (deprioritized and ignored for 3+ days)
 */
export const POST = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    console.log('[Stale Detection API] Starting stale detection process...');

    // Call the stale detection function
    const { data: results, error: functionError } = await supabaseAdmin
      .rpc('run_stale_detection');

    if (functionError) {
      console.error('[Stale Detection API] Function error:', functionError);
      throw new APIError(
        functionError.message || 'Failed to run stale detection',
        500,
        'DATABASE_ERROR'
      );
    }

    // Parse results
    const detectionResults: StaleDetectionResult[] = results || [];

    const markedResult = detectionResults.find((r) => r.action === 'marked');
    const unmarkedResult = detectionResults.find((r) => r.action === 'unmarked');

    const totalMarked = markedResult?.items_affected || 0;
    const totalUnmarked = unmarkedResult?.items_affected || 0;

    console.log(
      `[Stale Detection API] Completed: ${totalMarked} marked, ${totalUnmarked} unmarked`
    );

    return successResponse({
      message: 'Stale detection completed successfully',
      summary: {
        itemsMarked: totalMarked,
        itemsUnmarked: totalUnmarked,
        totalChanges: totalMarked + totalUnmarked,
      },
      details: {
        marked: markedResult?.details || [],
        unmarked: unmarkedResult?.details || [],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Stale Detection API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to run stale detection', 500, 'INTERNAL_ERROR');
  }
});

/**
 * GET /api/action-items/stale-detection
 * Get statistics about stale items
 */
export const GET = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    // Get stale items statistics
    const { data: statsData, error: statsError } = await supabaseAdmin
      .rpc('get_stale_items_stats')
      .single();

    if (statsError) {
      console.error('[Stale Detection API] Stats error:', statsError);
      throw new APIError(statsError.message || 'Failed to fetch stale stats', 500, 'DATABASE_ERROR');
    }

    const stats = statsData as unknown as StaleStats;

    // Get actual stale items
    const { data: staleItems, error: itemsError } = await supabaseAdmin
      .from('action_items')
      .select(`
        id,
        title,
        description,
        project_id,
        priority,
        type,
        status,
        previous_priority,
        priority_changed_at,
        updated_at,
        created_at,
        projects (
          id,
          name,
          current_phase
        )
      `)
      .eq('stale', true)
      .order('priority_changed_at', { ascending: true });

    if (itemsError) {
      console.error('[Stale Detection API] Items error:', itemsError);
      throw new APIError(itemsError.message || 'Failed to fetch stale items', 500, 'DATABASE_ERROR');
    }

    // Calculate days stale for each item
    const itemsWithAge = staleItems?.map((item) => {
      const daysStale = item.priority_changed_at
        ? Math.floor(
            (Date.now() - new Date(item.priority_changed_at).getTime()) / (1000 * 60 * 60 * 24)
          )
        : 0;

      return {
        ...item,
        days_stale: daysStale,
      };
    });

    return successResponse({
      stats: {
        totalStale: stats.total_stale || 0,
        byPriority: stats.by_priority || [],
        byProject: stats.by_project || [],
        oldestStaleDays: stats.oldest_stale_days || 0,
        averageStaleDays: stats.average_stale_days || 0,
      },
      items: itemsWithAge || [],
    });
  } catch (error) {
    console.error('[Stale Detection API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch stale detection data', 500, 'INTERNAL_ERROR');
  }
});
