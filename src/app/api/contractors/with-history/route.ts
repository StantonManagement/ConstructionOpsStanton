import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

interface ContractorWithHistory {
  id: number;
  name: string;
  trade: string | null;
  phone: string | null;
  email: string | null;
  avg_bid_amount: number | null;
  bid_count: number;
  won_count: number;
  win_rate: number;
  avg_variance: number | null;
  last_bid_date: string | null;
  high_variance_warning: boolean;
}

/**
 * GET /api/contractors/with-history
 * Get contractors with their historical bid performance metrics
 * Query params:
 *   - trade: Filter by trade (optional)
 */
export const GET = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { searchParams } = new URL(request.url);
    const trade = searchParams.get('trade');

    // Get all contractors
    let contractorQuery = supabaseAdmin
      .from('contractors')
      .select('id, name, trade, phone, email')
      .order('name');

    if (trade) {
      contractorQuery = contractorQuery.eq('trade', trade);
    }

    const { data: contractors, error: contractorError } = await contractorQuery;

    if (contractorError) {
      console.error('[Contractors History API] Contractor query error:', contractorError);
      throw new APIError(contractorError.message || 'Failed to fetch contractors', 500, 'DATABASE_ERROR');
    }

    if (!contractors || contractors.length === 0) {
      return successResponse([]);
    }

    // Get bid statistics for each contractor
    const contractorIds = contractors.map(c => c.id);

    const { data: bidStats, error: bidStatsError } = await supabaseAdmin
      .from('bids')
      .select('contractor_id, amount, status, variance_percent, submitted_at')
      .in('contractor_id', contractorIds)
      .not('status', 'eq', 'draft');

    if (bidStatsError) {
      console.error('[Contractors History API] Bid stats error:', bidStatsError);
      throw new APIError(bidStatsError.message || 'Failed to fetch bid statistics', 500, 'DATABASE_ERROR');
    }

    // Calculate metrics for each contractor
    const contractorsWithHistory: ContractorWithHistory[] = contractors.map(contractor => {
      const contractorBids = bidStats?.filter(b => b.contractor_id === contractor.id) || [];

      const submittedBids = contractorBids.filter(b =>
        b.status === 'submitted' || b.status === 'won' || b.status === 'lost'
      );
      const wonBids = contractorBids.filter(b => b.status === 'won');

      // Calculate average bid amount
      const avgBidAmount = submittedBids.length > 0
        ? submittedBids.reduce((sum, b) => sum + (b.amount || 0), 0) / submittedBids.length
        : null;

      // Calculate win rate
      const winRate = submittedBids.length > 0
        ? (wonBids.length / submittedBids.length) * 100
        : 0;

      // Calculate average variance (only for completed jobs with actual costs)
      const bidsWithVariance = contractorBids.filter(b =>
        b.variance_percent !== null && b.variance_percent !== undefined
      );
      const avgVariance = bidsWithVariance.length > 0
        ? bidsWithVariance.reduce((sum, b) => sum + (b.variance_percent || 0), 0) / bidsWithVariance.length
        : null;

      // Get last bid date
      const lastBidDate = submittedBids.length > 0
        ? submittedBids
            .map(b => b.submitted_at)
            .filter((date): date is string => date !== null)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null
        : null;

      // Warning if average variance is > 10%
      const highVarianceWarning = avgVariance !== null && avgVariance > 10;

      return {
        id: contractor.id,
        name: contractor.name,
        trade: contractor.trade,
        phone: contractor.phone,
        email: contractor.email,
        avg_bid_amount: avgBidAmount,
        bid_count: submittedBids.length,
        won_count: wonBids.length,
        win_rate: winRate,
        avg_variance: avgVariance,
        last_bid_date: lastBidDate,
        high_variance_warning: highVarianceWarning,
      };
    });

    return successResponse(contractorsWithHistory);
  } catch (error) {
    console.error('[Contractors History API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch contractors with history', 500, 'INTERNAL_ERROR');
  }
});
