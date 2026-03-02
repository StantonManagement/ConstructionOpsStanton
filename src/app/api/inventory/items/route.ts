import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/inventory/items
 * List all inventory items with optional filtering
 */
export const GET = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const isConsumable = searchParams.get('is_consumable');

    let query = supabaseAdmin
      .from('inventory_items')
      .select(`
        *,
        locations:inventory_locations(*)
      `)
      .order('name', { ascending: true });

    // Filter by category
    if (category) {
      query = query.eq('category', category);
    }

    // Filter by consumable status
    if (isConsumable !== null && isConsumable !== undefined) {
      query = query.eq('is_consumable', isConsumable === 'true');
    }

    // Search by name or SKU
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    const { data: items, error } = await query;

    if (error) {
      console.error('[GET /api/inventory/items] Database error:', error);
      throw new APIError('Failed to fetch inventory items', 500, 'DATABASE_ERROR');
    }

    // Calculate total quantity for each item
    const itemsWithTotals = items.map((item: Record<string, unknown>) => {
      const locations = item.locations as Array<{ quantity: number }> || [];
      const totalQuantity = locations.reduce((sum, loc) => sum + loc.quantity, 0);
      return {
        ...item,
        total_quantity: totalQuantity,
      };
    });

    return successResponse({ items: itemsWithTotals });
  } catch (error) {
    console.error('[GET /api/inventory/items] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch inventory items',
      500,
      'INTERNAL_ERROR'
    );
  }
});

/**
 * POST /api/inventory/items
 * Create a new inventory item
 */
export const POST = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      sku,
      is_consumable = false,
      unit,
      reorder_threshold,
      cost_per_unit,
      notes,
      photo_url
    } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      throw new APIError('Item name is required', 400, 'VALIDATION_ERROR');
    }

    if (!category) {
      throw new APIError('Category is required', 400, 'VALIDATION_ERROR');
    }

    // Validate category
    const validCategories = [
      'power_tool',
      'hand_tool',
      'safety_equipment',
      'material',
      'consumable',
      'equipment',
      'other'
    ];
    if (!validCategories.includes(category)) {
      throw new APIError(
        `Category must be one of: ${validCategories.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    // Validate numeric fields
    if (reorder_threshold !== undefined && reorder_threshold !== null) {
      const threshold = parseInt(reorder_threshold);
      if (isNaN(threshold) || threshold < 0) {
        throw new APIError('Reorder threshold must be a positive number', 400, 'VALIDATION_ERROR');
      }
    }

    if (cost_per_unit !== undefined && cost_per_unit !== null) {
      const cost = parseFloat(cost_per_unit);
      if (isNaN(cost) || cost < 0) {
        throw new APIError('Cost per unit must be a positive number', 400, 'VALIDATION_ERROR');
      }
    }

    // Create item
    const { data: item, error } = await supabaseAdmin
      .from('inventory_items')
      .insert([
        {
          name: name.trim(),
          description: description?.trim() || null,
          category,
          sku: sku?.trim() || null,
          is_consumable,
          unit: unit?.trim() || null,
          reorder_threshold: reorder_threshold || null,
          cost_per_unit: cost_per_unit || null,
          notes: notes?.trim() || null,
          photo_url: photo_url?.trim() || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[POST /api/inventory/items] Database error:', error);
      if (error.code === '23505') {
        throw new APIError('An item with this SKU already exists', 400, 'DUPLICATE_ERROR');
      }
      throw new APIError('Failed to create inventory item', 500, 'DATABASE_ERROR');
    }

    return successResponse(
      {
        message: 'Inventory item created successfully',
        item,
      },
      201
    );
  } catch (error) {
    console.error('[POST /api/inventory/items] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to create inventory item',
      500,
      'INTERNAL_ERROR'
    );
  }
});
