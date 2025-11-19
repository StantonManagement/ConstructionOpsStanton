import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  errorResponse, 
  APIError 
} from '@/lib/apiHelpers';

/**
 * GET /api/punch-list/categories
 * Get all punch list categories
 */
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { data: categories, error } = await supabaseAdmin
      .from('punch_list_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('[Punch List Categories API] Error fetching categories:', error);
      throw new APIError('Failed to fetch categories', 500, 'DATABASE_ERROR');
    }

    return successResponse({ categories: categories || [] });
  } catch (error) {
    console.error('[Punch List Categories API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch categories', 500, 'INTERNAL_ERROR');
  }
});

