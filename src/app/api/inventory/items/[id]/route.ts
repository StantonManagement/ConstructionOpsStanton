import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/inventory/items/[id]
 * Get a single inventory item with location details
 */
export const GET = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;
    const itemId = parseInt(id);

    if (isNaN(itemId)) {
      throw new APIError('Invalid item ID', 400, 'VALIDATION_ERROR');
    }

    // Get item with all locations
    const { data: item, error } = await supabaseAdmin
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
      .eq('id', itemId)
      .single();

    if (error) {
      console.error('[GET /api/inventory/items/[id]] Database error:', error);
      if (error.code === 'PGRST116') {
        throw new APIError('Item not found', 404, 'NOT_FOUND');
      }
      throw new APIError('Failed to fetch item', 500, 'DATABASE_ERROR');
    }

    // Calculate total quantity
    const locations = item.locations as Array<{ quantity: number }> || [];
    const totalQuantity = locations.reduce((sum: number, loc: { quantity: number }) => sum + loc.quantity, 0);

    return successResponse({
      item: {
        ...item,
        total_quantity: totalQuantity,
      },
    });
  } catch (error) {
    console.error('[GET /api/inventory/items/[id]] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch item',
      500,
      'INTERNAL_ERROR'
    );
  }
});

/**
 * PUT /api/inventory/items/[id]
 * Update an inventory item
 */
export const PUT = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;
    const itemId = parseInt(id);

    if (isNaN(itemId)) {
      throw new APIError('Invalid item ID', 400, 'VALIDATION_ERROR');
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      sku,
      is_consumable,
      unit,
      reorder_threshold,
      cost_per_unit,
      notes,
      photo_url
    } = body;

    // Build update object
    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      if (!name.trim()) {
        throw new APIError('Item name cannot be empty', 400, 'VALIDATION_ERROR');
      }
      updates.name = name.trim();
    }

    if (description !== undefined) updates.description = description?.trim() || null;
    if (sku !== undefined) updates.sku = sku?.trim() || null;
    if (unit !== undefined) updates.unit = unit?.trim() || null;
    if (notes !== undefined) updates.notes = notes?.trim() || null;
    if (photo_url !== undefined) updates.photo_url = photo_url?.trim() || null;
    if (is_consumable !== undefined) updates.is_consumable = is_consumable;

    if (category !== undefined) {
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
      updates.category = category;
    }

    if (reorder_threshold !== undefined) {
      if (reorder_threshold !== null) {
        const threshold = parseInt(reorder_threshold);
        if (isNaN(threshold) || threshold < 0) {
          throw new APIError('Reorder threshold must be a positive number', 400, 'VALIDATION_ERROR');
        }
        updates.reorder_threshold = threshold;
      } else {
        updates.reorder_threshold = null;
      }
    }

    if (cost_per_unit !== undefined) {
      if (cost_per_unit !== null) {
        const cost = parseFloat(cost_per_unit);
        if (isNaN(cost) || cost < 0) {
          throw new APIError('Cost per unit must be a positive number', 400, 'VALIDATION_ERROR');
        }
        updates.cost_per_unit = cost;
      } else {
        updates.cost_per_unit = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new APIError('No fields to update', 400, 'VALIDATION_ERROR');
    }

    // Update item
    const { data: item, error } = await supabaseAdmin
      .from('inventory_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('[PUT /api/inventory/items/[id]] Database error:', error);
      if (error.code === 'PGRST116') {
        throw new APIError('Item not found', 404, 'NOT_FOUND');
      }
      if (error.code === '23505') {
        throw new APIError('An item with this SKU already exists', 400, 'DUPLICATE_ERROR');
      }
      throw new APIError('Failed to update item', 500, 'DATABASE_ERROR');
    }

    return successResponse({
      message: 'Item updated successfully',
      item,
    });
  } catch (error) {
    console.error('[PUT /api/inventory/items/[id]] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to update item',
      500,
      'INTERNAL_ERROR'
    );
  }
});

/**
 * DELETE /api/inventory/items/[id]
 * Delete an inventory item
 */
export const DELETE = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;
    const itemId = parseInt(id);

    if (isNaN(itemId)) {
      throw new APIError('Invalid item ID', 400, 'VALIDATION_ERROR');
    }

    // Check if item has inventory in any location
    const { data: locations, error: locationError } = await supabaseAdmin
      .from('inventory_locations')
      .select('id, quantity')
      .eq('item_id', itemId);

    if (locationError) {
      console.error('[DELETE /api/inventory/items/[id]] Location check error:', locationError);
      throw new APIError('Failed to check item inventory', 500, 'DATABASE_ERROR');
    }

    const totalQuantity = locations?.reduce((sum, loc) => sum + loc.quantity, 0) || 0;
    if (totalQuantity > 0) {
      throw new APIError(
        `Cannot delete item with ${totalQuantity} unit(s) in inventory. Please remove all inventory first.`,
        400,
        'VALIDATION_ERROR'
      );
    }

    // Delete item (cascade will delete empty location records)
    const { error } = await supabaseAdmin
      .from('inventory_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('[DELETE /api/inventory/items/[id]] Database error:', error);
      throw new APIError('Failed to delete item', 500, 'DATABASE_ERROR');
    }

    return successResponse({
      message: 'Item deleted successfully',
    });
  } catch (error) {
    console.error('[DELETE /api/inventory/items/[id]] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to delete item',
      500,
      'INTERNAL_ERROR'
    );
  }
});
