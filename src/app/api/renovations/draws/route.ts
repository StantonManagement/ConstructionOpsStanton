import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('property_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabaseAdmin
      .from('construction_draws')
      .select('*, projects(name)');

    if (propertyId) {
      query = query.eq('project_id', propertyId);
    }

    if (status) {
      const statuses = status.split(',');
      if (!statuses.includes('all')) {
        query = query.in('status', statuses);
      }
    }

    query = query.order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query; // Add { count: 'exact' } if we want total? 
    // supabase select with count requires the modifier in select() or as 2nd arg?
    // .select('*, projects(name)', { count: 'exact' })

    if (error) {
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    // Since I didn't add { count: 'exact' } in the query chain properly above (needs to be in select), let's fix it.
    // Actually, let's re-construct query properly.
    
    const countQuery = supabaseAdmin
        .from('construction_draws')
        .select('*', { count: 'exact', head: true });
        
    if (propertyId) countQuery.eq('project_id', propertyId);
    if (status && !status.includes('all')) countQuery.in('status', status.split(','));
    
    const { count: totalCount } = await countQuery;

    return successResponse({
      draws: data,
      total: totalCount || 0,
      limit,
      offset
    });

  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch draws', 500, 'INTERNAL_ERROR');
  }
});
