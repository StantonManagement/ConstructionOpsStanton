import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  errorResponse, 
  APIError 
} from '@/lib/apiHelpers';

/**
 * GET /api/warranties/types
 * Get all warranty types
 */
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { data: types, error } = await supabaseAdmin
      .from('warranty_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('[Warranty Types API] Error fetching types:', error);
      throw new APIError('Failed to fetch warranty types', 500, 'DATABASE_ERROR');
    }

    return successResponse({ types: types || [] });
  } catch (error) {
    console.error('[Warranty Types API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch warranty types', 500, 'INTERNAL_ERROR');
  }
});

