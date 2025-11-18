import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  errorResponse, 
  APIError,
  withCache,
  withTimeout as apiWithTimeout
} from '@/lib/apiHelpers';

/**
 * PM Dashboard Data API
 * Fetches all data needed for the PM Dashboard in one optimized request
 * Uses service role for relationship queries
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    // Fetch all data in parallel using relationship queries
    const [
      paymentAppsResult,
      projectsResult,
      projectStatsResult,
      contractorStatsResult,
      approvedPaymentsResult,
      smsConvosResult
    ] = await Promise.all([
      // Payment applications with full relationships
      supabaseAdmin
        .from('payment_applications')
        .select(`
          id,
          status,
          current_payment,
          current_period_value,
          created_at,
          project:projects(id, name, client_name),
          contractor:contractors(id, name, trade),
          line_item_progress:payment_line_item_progress(
            id,
            line_item:project_line_items(id, description_of_work)
          )
        `)
        .order('created_at', { ascending: false }),
      
      // Active projects
      supabaseAdmin
        .from('projects')
        .select('id, name, client_name, current_phase, at_risk, target_completion_date, budget, spent, status')
        .eq('status', 'active'),
      
      // All projects for statistics
      supabaseAdmin
        .from('projects')
        .select('id, status, at_risk, budget, spent'),
      
      // Active contractor stats
      supabaseAdmin
        .from('project_contractors')
        .select('contract_amount, paid_to_date')
        .eq('contract_status', 'active'),
      
      // Approved payments for spending calculations
      supabaseAdmin
        .from('payment_applications')
        .select('current_period_value')
        .eq('status', 'approved'),
      
      // SMS conversations
      supabaseAdmin
        .from('payment_sms_conversations')
        .select('id, conversation_state')
    ]);

    // Check for errors
    if (paymentAppsResult.error) {
      throw new APIError(`Failed to fetch payment applications: ${paymentAppsResult.error.message}`, 500, 'DB_ERROR');
    }
    if (projectsResult.error) {
      throw new APIError(`Failed to fetch projects: ${projectsResult.error.message}`, 500, 'DB_ERROR');
    }
    if (projectStatsResult.error) {
      console.warn('[PM Dashboard API] Project stats error:', projectStatsResult.error);
    }
    if (contractorStatsResult.error) {
      console.warn('[PM Dashboard API] Contractor stats error:', contractorStatsResult.error);
    }
    if (approvedPaymentsResult.error) {
      console.warn('[PM Dashboard API] Approved payments error:', approvedPaymentsResult.error);
    }
    if (smsConvosResult.error) {
      console.warn('[PM Dashboard API] SMS conversations error:', smsConvosResult.error);
    }

    const paymentApps = paymentAppsResult.data || [];
    const projects = projectsResult.data || [];
    const projectStats = projectStatsResult.data || [];
    const contractorStats = contractorStatsResult.data || [];
    const approvedPayments = approvedPaymentsResult.data || [];
    const smsConvos = smsConvosResult.data || [];

    // Calculate statistics
    const totalProjects = projectStats.length;
    const activeProjects = projectStats.filter((p: any) => p.status === 'active').length;
    const atRiskProjects = projectStats.filter((p: any) => p.at_risk).length;
    
    const totalBudget = contractorStats.reduce(
      (sum: number, c: any) => sum + (Number(c.contract_amount) || 0),
      0
    );
    
    const totalSpent = approvedPayments.reduce(
      (sum: number, p: any) => sum + (Number(p.current_period_value) || 0),
      0
    );
    
    const completionPercentage = totalBudget > 0 
      ? Math.round((totalSpent / totalBudget) * 100) 
      : 0;

    const pendingSMS = smsConvos.filter(
      (c: any) => c.conversation_state !== 'completed'
    ).length;
    
    const reviewQueue = paymentApps.filter(
      (app: any) => app.status === 'submitted'
    ).length;
    
    const readyChecks = paymentApps.filter(
      (app: any) => app.status === 'sms_sent'
    ).length;

    // Calculate weekly total (last 7 days of approved payments)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklyTotal = paymentApps
      .filter((a: any) => {
        if (!a.created_at || a.status !== 'approved') return false;
        const createdDate = new Date(a.created_at);
        return createdDate >= weekAgo;
      })
      .reduce((sum: number, a: any) => sum + (a.current_period_value || 0), 0);

    // Sort payment apps: submitted first, then by date
    const sortedPaymentApps = paymentApps.sort((a: any, b: any) => {
      if (a.status === 'submitted' && b.status !== 'submitted') return -1;
      if (a.status !== 'submitted' && b.status === 'submitted') return 1;
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    const response = successResponse({
      paymentApps: sortedPaymentApps,
      projects,
      stats: {
        pending_sms: pendingSMS,
        review_queue: reviewQueue,
        ready_checks: readyChecks,
        weekly_total: weeklyTotal,
        total_projects: totalProjects,
        active_projects: activeProjects,
        at_risk_projects: atRiskProjects,
        total_budget: totalBudget,
        total_spent: totalSpent,
        completion_percentage: completionPercentage,
      }
    });

    // Cache for 30 seconds
    return withCache(response, 30);

  } catch (err) {
    console.error('[PM Dashboard API] Error:', err);
    
    if (err instanceof APIError) {
      return errorResponse(err.message, err.statusCode, err.code);
    }
    
    if (err instanceof Error) {
      return errorResponse(err.message, 500, 'INTERNAL_ERROR');
    }
    
    return errorResponse('Failed to fetch dashboard data', 500, 'UNKNOWN_ERROR');
  }
});

