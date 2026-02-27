import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, getQueryParams } from '@/lib/apiHelpers';

/**
 * GET /api/payments/applications
 * Get all payment applications with optional filters
 *
 * Query params:
 * - project_id: Filter by project
 * - contractor_id: Filter by contractor
 * - status: Filter by status (pending, approved, rejected, etc.)
 * - limit: Number of results (default: 50)
 * - offset: Pagination offset (default: 0)
 */
export const GET = withAuth(async (request: NextRequest, context: any, user: any) => {
  try {
    if (!supabaseAdmin) {
      return errorResponse('Service role client not available', 500, 'SERVER_ERROR');
    }

    // Parse query parameters
    const params = getQueryParams(request, {
      project_id: null as string | null,
      contractor_id: null as string | null,
      status: null as string | null,
      limit: 50,
      offset: 0,
    });

    // Build query
    let query = supabaseAdmin
      .from('payment_applications')
      .select(`
        *,
        project:projects(id, name, address),
        contractor:contractors(id, name, trade, email, phone)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (params.project_id) {
      query = query.eq('project_id', parseInt(params.project_id));
    }

    if (params.contractor_id) {
      query = query.eq('contractor_id', parseInt(params.contractor_id));
    }

    if (params.status) {
      query = query.eq('status', params.status);
    }

    // Apply pagination
    query = query.range(params.offset, params.offset + params.limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[Payment Applications GET] Error:', error);
      return errorResponse(error.message, 500, 'DATABASE_ERROR');
    }

    // Get total count for pagination
    const { count: totalCount } = await supabaseAdmin
      .from('payment_applications')
      .select('*', { count: 'exact', head: true });

    return successResponse({
      applications: data || [],
      count: data?.length || 0,
      total: totalCount || 0,
      limit: params.limit,
      offset: params.offset,
    });
  } catch (error) {
    console.error('[Payment Applications GET] Exception:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
});