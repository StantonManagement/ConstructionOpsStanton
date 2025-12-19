import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/cash-flow/forecast
 * Get cash forecast for next N weeks based on scheduled tasks
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const weeks = parseInt(searchParams.get('weeks') || '4');

    if (!projectId) {
      throw new APIError('project_id is required', 400, 'VALIDATION_ERROR');
    }

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (weeks * 7));

    const { data: rows, error } = await supabaseAdmin
      .from('cash_flow_forecast')
      .select('*')
      .eq('project_id', projectId)
      .gte('week_start', startDate.toISOString())
      .lte('week_start', endDate.toISOString())
      .order('week_start');

    if (error) {
      console.error('[Cash Flow Forecast API] Error:', error);
      throw new APIError('Failed to fetch forecast', 500, 'DATABASE_ERROR');
    }

    // Group by week
    const weeksData: Record<string, any> = {};
    let totalForecast = 0;

    rows?.forEach((row: any) => {
      const weekStart = row.week_start.split('T')[0];
      if (!weeksData[weekStart]) {
        weeksData[weekStart] = {
          week_start: weekStart,
          forecasted_cost: 0,
          by_category: []
        };
      }

      const cost = parseFloat(row.forecasted_cost || '0');
      weeksData[weekStart].forecasted_cost += cost;
      weeksData[weekStart].by_category.push({
        category: row.budget_category || 'Unassigned',
        cost: cost,
        task_count: row.task_count
      });

      totalForecast += cost;
    });

    const weeksArray = Object.values(weeksData).sort((a, b) => a.week_start.localeCompare(b.week_start));

    return successResponse({
      project_id: projectId,
      weeks: weeksArray,
      total_forecast: totalForecast
    });

  } catch (error) {
    console.error('[Cash Flow Forecast API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch forecast', 500, 'INTERNAL_ERROR');
  }
});
