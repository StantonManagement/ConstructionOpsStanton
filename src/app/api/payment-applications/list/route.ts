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
 * Payment Applications List API
 * Fetches payment applications with full relationships and optional filters
 * Uses service role for relationship queries
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

    console.log('[Payment Applications API] Starting fetch with filters:', filters);
    const startTime = Date.now();

    // Build query with filters
    let appsQuery = supabaseAdmin
      .from('payment_applications')
      .select(`
        id,
        status,
        current_payment,
        current_period_value,
        created_at,
        project_id,
        contractor_id,
        project:projects(id, name, client_name),
        contractor:contractors(id, name, trade),
        line_item_progress:payment_line_item_progress(
          id,
          line_item:project_line_items(id, description_of_work)
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.status && filters.status !== 'all') {
      appsQuery = appsQuery.eq('status', filters.status);
    }

    if (filters.project_id) {
      appsQuery = appsQuery.eq('project_id', filters.project_id);
    }

    if (filters.contractor_id) {
      appsQuery = appsQuery.eq('contractor_id', filters.contractor_id);
    }

    if (filters.date_from) {
      appsQuery = appsQuery.gte('created_at', filters.date_from);
    }

    if (filters.date_to) {
      appsQuery = appsQuery.lte('created_at', filters.date_to);
    }

    // Execute query
    const { data: appsData, error: appsError } = await appsQuery;

    if (appsError) {
      throw new APIError(`Failed to fetch payment applications: ${appsError.message}`, 500, 'DB_ERROR');
    }

    const applications = appsData || [];

    // Sort: submitted first, then by date
    const sortedApplications = applications.sort((a: any, b: any) => {
      if (a.status === 'submitted' && b.status !== 'submitted') return -1;
      if (a.status !== 'submitted' && b.status === 'submitted') return 1;
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    // Fetch active projects for filter dropdown (in parallel)
    const { data: projectsData, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, name, client_name')
      .eq('status', 'active');

    if (projectsError) {
      console.warn('[Payment Applications API] Failed to fetch projects:', projectsError);
    }

    const fetchTime = Date.now() - startTime;
    console.log(`[Payment Applications API] Fetched ${sortedApplications.length} applications in ${fetchTime}ms`);

    const response = successResponse({
      applications: sortedApplications,
      projects: projectsData || []
    });

    // Cache for 30 seconds
    return withCache(response, 30);

  } catch (err) {
    console.error('[Payment Applications API] Error:', err);
    
    if (err instanceof APIError) {
      return errorResponse(err.message, err.statusCode, err.code);
    }
    
    if (err instanceof Error) {
      return errorResponse(err.message, 500, 'INTERNAL_ERROR');
    }
    
    return errorResponse('Failed to fetch payment applications', 500, 'UNKNOWN_ERROR');
  }
});

