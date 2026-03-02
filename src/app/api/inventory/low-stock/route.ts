import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/inventory/low-stock
 * Get items that are below their reorder threshold
 */
export const GET = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    // Get all items that have a reorder threshold set
    const { data: items, error } = await supabaseAdmin
      .from('inventory_items')
      .select(`
        *,
        locations:inventory_locations(*)
      `)
      .not('reorder_threshold', 'is', null)
      .order('name', { ascending: true });

    if (error) {
      console.error('[GET /api/inventory/low-stock] Database error:', error);
      throw new APIError('Failed to fetch low stock items', 500, 'DATABASE_ERROR');
    }

    // Calculate totals and filter for items below threshold
    const lowStockItems = items
      .map((item: Record<string, unknown>) => {
        const locations = (item.locations as Array<{ quantity: number }>) || [];
        const totalQuantity = locations.reduce((sum, loc) => sum + loc.quantity, 0);

        return {
          ...item,
          total_quantity: totalQuantity,
        };
      })
      .filter((item: Record<string, unknown>) => {
        const total = item.total_quantity as number;
        const threshold = item.reorder_threshold as number;
        return total <= threshold;
      })
      .map((item: Record<string, unknown>) => {
        const total = item.total_quantity as number;
        const threshold = item.reorder_threshold as number;
        const shortfall = threshold - total;

        return {
          ...item,
          shortfall,
          urgency: total === 0 ? 'critical' : (shortfall > threshold * 0.5 ? 'high' : 'medium'),
        };
      })
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        // Sort by urgency (critical first), then by shortfall
        const urgencyOrder = { critical: 0, high: 1, medium: 2 };
        const aUrgency = urgencyOrder[a.urgency as keyof typeof urgencyOrder] || 3;
        const bUrgency = urgencyOrder[b.urgency as keyof typeof urgencyOrder] || 3;

        if (aUrgency !== bUrgency) {
          return aUrgency - bUrgency;
        }

        return (b.shortfall as number) - (a.shortfall as number);
      });

    // Group by urgency for easy filtering
    const grouped = {
      critical: lowStockItems.filter((item: Record<string, unknown>) => item.urgency === 'critical'),
      high: lowStockItems.filter((item: Record<string, unknown>) => item.urgency === 'high'),
      medium: lowStockItems.filter((item: Record<string, unknown>) => item.urgency === 'medium'),
    };

    return successResponse({
      total_low_stock_items: lowStockItems.length,
      critical_count: grouped.critical.length,
      high_count: grouped.high.length,
      medium_count: grouped.medium.length,
      items: lowStockItems,
      grouped,
    });
  } catch (error) {
    console.error('[GET /api/inventory/low-stock] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch low stock items',
      500,
      'INTERNAL_ERROR'
    );
  }
});
