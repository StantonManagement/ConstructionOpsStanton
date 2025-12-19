import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/reports/blocking
 * Returns blocked locations grouped by reason
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');

    // Start query on blocking_report view
    let query = supabaseAdmin
      .from('blocking_report')
      .select('*')
      .order('blocked_since', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('[Blocking Report API] Error:', error);
      throw new APIError('Failed to fetch blocking report', 500, 'DATABASE_ERROR');
    }

    // Group by reason in memory
    const byReason: Record<string, any> = {};
    let totalBlocked = 0;
    let totalAffectedCost = 0;

    rows?.forEach((row: any) => {
      const reason = row.blocked_reason;
      if (!byReason[reason]) {
        byReason[reason] = {
          reason,
          count: 0,
          affected_tasks: 0,
          affected_cost: 0,
          items: []
        };
      }

      byReason[reason].count++;
      byReason[reason].affected_tasks += parseInt(row.affected_tasks || '0');
      byReason[reason].affected_cost += parseFloat(row.affected_cost || '0');
      byReason[reason].items.push(row);

      totalBlocked++;
      totalAffectedCost += parseFloat(row.affected_cost || '0');
    });

    return successResponse({
      by_reason: byReason,
      total_blocked: totalBlocked,
      total_affected_cost: totalAffectedCost
    });

  } catch (error) {
    console.error('[Blocking Report API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch blocking report', 500, 'INTERNAL_ERROR');
  }
});
