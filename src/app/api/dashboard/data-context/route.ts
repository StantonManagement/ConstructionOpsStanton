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
 * DataContext API
 * Fetches all data needed for the main dashboard (Admin/Staff roles)
 * Uses service role for relationship queries
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    console.log('[DataContext API] Starting data fetch...');
    const startTime = Date.now();

    // Fetch all data in parallel using relationship queries
    const [projectsResponse, contractorsResponse, contractsResponse] = await Promise.all([
      // Projects
      supabaseAdmin
        .from('projects')
        .select('*'),
      
      // Contractors
      supabaseAdmin
        .from('contractors')
        .select('*'),
      
      // Contracts (project_contractors) with relationships
      supabaseAdmin
        .from('project_contractors')
        .select(`
          *,
          projects:project_id (id, name, client_name),
          contractors:contractor_id (id, name, trade)
        `)
    ]);

    const fetchTime = Date.now() - startTime;
    console.log(`[DataContext API] Data fetch completed in ${fetchTime}ms`);

    // Handle projects
    let projects: any[] = [];
    if (projectsResponse.error) {
      console.error('[DataContext API] Error fetching projects:', projectsResponse.error);
    } else if (projectsResponse.data) {
      projects = projectsResponse.data;
      console.log(`[DataContext API] Fetched ${projects.length} projects`);
    }

    // Handle contractors
    let contractors: any[] = [];
    if (contractorsResponse.error) {
      console.error('[DataContext API] Error fetching contractors:', contractorsResponse.error);
    } else if (contractorsResponse.data) {
      // Map to expected format with default values
      contractors = contractorsResponse.data.map((c: any) => ({
        id: c.id,
        name: c.name,
        trade: c.trade,
        contractAmount: 0,
        paidToDate: 0,
        lastPayment: '',
        status: c.status || 'active',
        changeOrdersPending: false,
        lineItemCount: 0,
        phone: c.phone || '',
        email: c.email || '',
        hasOpenPaymentApp: false,
        compliance: {
          insurance: 'valid',
          license: 'valid'
        }
      }));
      console.log(`[DataContext API] Fetched ${contractors.length} contractors`);
    }

    // Handle contracts
    let contracts: any[] = [];
    if (contractsResponse.error) {
      console.error('[DataContext API] Error fetching contracts:', contractsResponse.error);
      if (contractsResponse.error.message?.includes('relationship')) {
        console.warn('[DataContext API] Relationship query failed - check database relationships');
      }
    } else if (contractsResponse.data) {
      // Map to expected format
      contracts = contractsResponse.data.map((c: any) => ({
        id: c.id,
        project_id: c.project_id,
        subcontractor_id: c.contractor_id, // project_contractors uses contractor_id
        contract_amount: c.contract_amount,
        contract_nickname: c.contract_nickname,
        start_date: '', // project_contractors doesn't have start_date
        end_date: '', // project_contractors doesn't have end_date  
        status: c.contract_status || 'active',
        project: c.projects,
        subcontractor: c.contractors
      }));
      console.log(`[DataContext API] Fetched ${contracts.length} contracts`);
    }

    const response = successResponse({
      projects,
      subcontractors: contractors,
      contracts,
      paymentApplications: {
        awaitingSMS: [],
        pmReview: [],
        checkReady: []
      }
    });

    // Cache for 30 seconds
    return withCache(response, 30);

  } catch (err) {
    console.error('[DataContext API] Error:', err);
    
    if (err instanceof APIError) {
      return errorResponse(err.message, err.statusCode, err.code);
    }
    
    if (err instanceof Error) {
      return errorResponse(err.message, 500, 'INTERNAL_ERROR');
    }
    
    return errorResponse('Failed to fetch dashboard data', 500, 'UNKNOWN_ERROR');
  }
});

