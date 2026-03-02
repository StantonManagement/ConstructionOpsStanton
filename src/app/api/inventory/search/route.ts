import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/inventory/search
 * Search for inventory items and their locations
 * Useful for finding where specific tools are located
 */
export const GET = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      throw new APIError('Search query must be at least 2 characters', 400, 'VALIDATION_ERROR');
    }

    // Search items by name, SKU, or description
    const { data: items, error } = await supabaseAdmin
      .from('inventory_items')
      .select(`
        *,
        locations:inventory_locations(
          *,
          truck:trucks(id, name, identifier),
          project:projects(id, name),
          assigned_user:users(id, email, name)
        )
      `)
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%,description.ilike.%${query}%`)
      .order('name', { ascending: true });

    if (error) {
      console.error('[GET /api/inventory/search] Database error:', error);
      throw new APIError('Failed to search inventory', 500, 'DATABASE_ERROR');
    }

    // Calculate totals and format results
    const results = items.map((item: Record<string, unknown>) => {
      const locations = (item.locations as Array<Record<string, unknown>>) || [];
      const totalQuantity = locations.reduce((sum: number, loc: Record<string, unknown>) =>
        sum + ((loc.quantity as number) || 0), 0
      );

      return {
        ...item,
        total_quantity: totalQuantity,
        location_count: locations.length,
      };
    });

    return successResponse({
      query,
      count: results.length,
      items: results,
    });
  } catch (error) {
    console.error('[GET /api/inventory/search] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to search inventory',
      500,
      'INTERNAL_ERROR'
    );
  }
});
