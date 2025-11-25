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
 * Projects List API
 * Fetches projects with optional filters and enriched statistics
 * Uses service role for optimal queries
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    // Parse request body for optional filters
    let filters: any = {};
    try {
      const body = await request.json();
      filters = body || {};
    } catch (e) {
      // No body or invalid JSON - use defaults
    }

    console.log('[Projects API] Starting projects fetch...');
    const startTime = Date.now();

    // Fetch projects (with optional status filter)
    let projectsQuery = supabaseAdmin
      .from('projects')
      .select('*')
      .order('name');

    if (filters.status) {
      projectsQuery = projectsQuery.eq('status', filters.status);
    }

    // Exclude deleted projects by default
    // If explicit filter is provided, use it. Otherwise default to excluding 'deleted'
    // Note: Some status fields might be different strings like "active", "completed", etc.
    if (filters.excludeDeleted !== false) {
      // Check if status filter was already applied. If so, don't double filter if it conflicts, 
      // but usually we want to ensure we don't show deleted unless specifically asked.
      // If filters.status IS 'deleted', then we shouldn't filter it out.
      if (filters.status !== 'deleted') {
         projectsQuery = projectsQuery.neq('status', 'deleted');
      }
    }

    const { data: projectsData, error: projectsError } = await projectsQuery;

    if (projectsError) {
      throw new APIError(`Failed to load projects: ${projectsError.message}`, 500, 'DB_ERROR');
    }

    if (!projectsData || projectsData.length === 0) {
      return successResponse({ projects: [] });
    }

    // Only enrich if requested
    if (filters.enrich) {
      // Get all project IDs for batch queries
      const projectIds = projectsData.map((p: any) => p.id);

      // Fetch stats in parallel (non-blocking - if they fail, still return projects)
      const [
        contractorsResult,
        paymentAppsResult,
        budgetResult,
        approvedPaymentsResult
      ] = await Promise.allSettled([
        supabaseAdmin
          .from('project_contractors')
          .select('id, project_id')
          .in('project_id', projectIds)
          .eq('contract_status', 'active'),
        supabaseAdmin
          .from('payment_applications')
          .select('id, status, project_id')
          .in('project_id', projectIds),
        supabaseAdmin
          .from('project_contractors')
          .select('contract_amount, paid_to_date, project_id')
          .in('project_id', projectIds)
          .eq('contract_status', 'active'),
        supabaseAdmin
          .from('payment_applications')
          .select('current_payment, project_id')
          .in('project_id', projectIds)
          .eq('status', 'approved')
      ]);

      // Extract data from results (with safe defaults)
      const contractorsData = contractorsResult.status === 'fulfilled' && !contractorsResult.value.error
        ? contractorsResult.value.data || []
        : [];
      
      const paymentAppsData = paymentAppsResult.status === 'fulfilled' && !paymentAppsResult.value.error
        ? paymentAppsResult.value.data || []
        : [];
      
      const budgetData = budgetResult.status === 'fulfilled' && !budgetResult.value.error
        ? budgetResult.value.data || []
        : [];
      
      const approvedPaymentsData = approvedPaymentsResult.status === 'fulfilled' && !approvedPaymentsResult.value.error
        ? approvedPaymentsResult.value.data || []
        : [];

      // Group data by project_id for efficient lookup
      const contractorsByProject = contractorsData.reduce((acc: any, item: any) => {
        acc[item.project_id] = (acc[item.project_id] || 0) + 1;
        return acc;
      }, {});

      const paymentAppsByProject = paymentAppsData.reduce((acc: any, item: any) => {
        if (!acc[item.project_id]) acc[item.project_id] = { active: 0, completed: 0 };
        if (['submitted', 'needs_review'].includes(item.status)) {
          acc[item.project_id].active++;
        } else if (item.status === 'approved') {
          acc[item.project_id].completed++;
        }
        return acc;
      }, {});

      const budgetByProject = budgetData.reduce((acc: any, item: any) => {
        if (!acc[item.project_id]) acc[item.project_id] = 0;
        acc[item.project_id] += Number(item.contract_amount) || 0;
        return acc;
      }, {});

      const spentByProject = approvedPaymentsData.reduce((acc: any, item: any) => {
        if (!acc[item.project_id]) acc[item.project_id] = 0;
        acc[item.project_id] += Number(item.current_payment) || 0;
        return acc;
      }, {});

      // Enrich projects with stats
      const enrichedProjects = projectsData.map((project: any) => {
        const totalContractors = contractorsByProject[project.id] || 0;
        const paymentApps = paymentAppsByProject[project.id] || { active: 0, completed: 0 };
        const totalBudget = budgetByProject[project.id] || 0;
        const totalSpent = spentByProject[project.id] || 0;
        const completionPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

        return {
          ...project,
          stats: {
            totalContractors,
            activePaymentApps: paymentApps.active,
            completedPaymentApps: paymentApps.completed,
            totalBudget,
            totalSpent,
            completionPercentage
          }
        };
      });

      const fetchTime = Date.now() - startTime;
      console.log(`[Projects API] Fetched ${enrichedProjects.length} enriched projects in ${fetchTime}ms`);

      const response = successResponse({ projects: enrichedProjects });
      // Cache enriched data for 60 seconds
      return withCache(response, 60);
    }

    // Return raw projects if no enrichment requested
    const fetchTime = Date.now() - startTime;
    console.log(`[Projects API] Fetched ${projectsData.length} raw projects in ${fetchTime}ms`);
    const response = successResponse({ projects: projectsData });
    
    // Cache raw list for shorter time or same time? Let's keep 60s for consistency
    return withCache(response, 60);

  } catch (err) {
    console.error('[Projects API] Error:', err);
    
    if (err instanceof APIError) {
      return errorResponse(err.message, err.statusCode, err.code);
    }
    
    if (err instanceof Error) {
      return errorResponse(err.message, 500, 'INTERNAL_ERROR');
    }
    
    return errorResponse('Failed to fetch projects', 500, 'UNKNOWN_ERROR');
  }
});
