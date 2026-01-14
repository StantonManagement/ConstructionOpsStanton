import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/cash-position
 * Returns cash position by portfolio and funding source
 * Query params:
 *   - portfolio_id: Filter to specific portfolio
 */
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const client = supabaseAdmin;
    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolio_id');

    let query = client
      .from('portfolios')
      .select(`
        id,
        name,
        code,
        funding_sources (
          id,
          name,
          type,
          commitment_amount,
          drawn_amount,
          lender_name,
          interest_rate,
          maturity_date
        )
      `)
      .eq('is_active', true);

    if (portfolioId) {
      query = query.eq('id', portfolioId);
    }

    const { data: portfolios, error } = await query.order('name');

    if (error) {
      console.error('[Cash Position API] Query error:', error);
      throw new APIError(error.message || 'Failed to fetch cash position', 500, 'DATABASE_ERROR');
    }

    // Calculate remaining and eligible amounts for each funding source
    const enrichedPortfolios = await Promise.all(
      (portfolios || []).map(async (portfolio) => {
        const fundingSources = await Promise.all(
          (portfolio.funding_sources || []).map(async (fs: any) => {
            const remaining = (fs.commitment_amount || 0) - (fs.drawn_amount || 0);
            
            // Calculate eligible to draw: sum of verified tasks for properties in this portfolio
            const { data: eligibleTasks } = await client
              .from('tasks')
              .select('actual_cost, locations!inner(project_id, projects!inner(portfolio_id))')
              .eq('status', 'verified')
              .eq('locations.projects.portfolio_id', portfolio.id);

            const eligibleToDraw = (eligibleTasks || []).reduce(
              (sum: number, task: any) => sum + (task.actual_cost || 0),
              0
            );

            return {
              ...fs,
              remaining,
              eligible_to_draw: eligibleToDraw,
            };
          })
        );

        // Calculate portfolio totals
        const totals = fundingSources.reduce(
          (acc, fs) => ({
            commitment: acc.commitment + (fs.commitment_amount || 0),
            drawn: acc.drawn + (fs.drawn_amount || 0),
            remaining: acc.remaining + fs.remaining,
            eligible: acc.eligible + fs.eligible_to_draw,
          }),
          { commitment: 0, drawn: 0, remaining: 0, eligible: 0 }
        );

        return {
          ...portfolio,
          funding_sources: fundingSources,
          totals,
        };
      })
    );

    return successResponse({ portfolios: enrichedPortfolios });
  } catch (error) {
    console.error('[Cash Position API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch cash position', 500, 'INTERNAL_ERROR');
  }
});
