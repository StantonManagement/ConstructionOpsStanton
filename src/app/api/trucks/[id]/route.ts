import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/trucks/[id]
 * Get a single truck by ID
 */
export const GET = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;
    const truckId = parseInt(id);

    if (isNaN(truckId)) {
      throw new APIError('Invalid truck ID', 400, 'VALIDATION_ERROR');
    }

    const { data: truck, error } = await supabaseAdmin
      .from('trucks')
      .select('*')
      .eq('id', truckId)
      .single();

    if (error) {
      console.error('[GET /api/trucks/[id]] Database error:', error);
      if (error.code === 'PGRST116') {
        throw new APIError('Truck not found', 404, 'NOT_FOUND');
      }
      throw new APIError('Failed to fetch truck', 500, 'DATABASE_ERROR');
    }

    return successResponse({ truck });
  } catch (error) {
    console.error('[GET /api/trucks/[id]] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch truck',
      500,
      'INTERNAL_ERROR'
    );
  }
});

/**
 * PUT /api/trucks/[id]
 * Update a truck
 */
export const PUT = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;
    const truckId = parseInt(id);

    if (isNaN(truckId)) {
      throw new APIError('Invalid truck ID', 400, 'VALIDATION_ERROR');
    }

    const body = await request.json();
    const {
      name,
      identifier,
      license_plate,
      vin,
      make,
      model,
      year,
      status,
      notes
    } = body;

    // Build update object (only include provided fields)
    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      if (!name.trim()) {
        throw new APIError('Truck name cannot be empty', 400, 'VALIDATION_ERROR');
      }
      updates.name = name.trim();
    }

    if (identifier !== undefined) {
      if (!identifier.trim()) {
        throw new APIError('Truck identifier cannot be empty', 400, 'VALIDATION_ERROR');
      }
      updates.identifier = identifier.trim();
    }

    if (license_plate !== undefined) updates.license_plate = license_plate?.trim() || null;
    if (vin !== undefined) updates.vin = vin?.trim() || null;
    if (make !== undefined) updates.make = make?.trim() || null;
    if (model !== undefined) updates.model = model?.trim() || null;
    if (notes !== undefined) updates.notes = notes?.trim() || null;

    if (year !== undefined) {
      if (year && (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1)) {
        throw new APIError('Invalid year value', 400, 'VALIDATION_ERROR');
      }
      updates.year = year || null;
    }

    if (status !== undefined) {
      const validStatuses = ['active', 'maintenance', 'retired'];
      if (!validStatuses.includes(status)) {
        throw new APIError(
          `Status must be one of: ${validStatuses.join(', ')}`,
          400,
          'VALIDATION_ERROR'
        );
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      throw new APIError('No fields to update', 400, 'VALIDATION_ERROR');
    }

    // Update truck
    const { data: truck, error } = await supabaseAdmin
      .from('trucks')
      .update(updates)
      .eq('id', truckId)
      .select()
      .single();

    if (error) {
      console.error('[PUT /api/trucks/[id]] Database error:', error);
      if (error.code === 'PGRST116') {
        throw new APIError('Truck not found', 404, 'NOT_FOUND');
      }
      if (error.code === '23505') {
        throw new APIError('A truck with this identifier already exists', 400, 'DUPLICATE_ERROR');
      }
      throw new APIError('Failed to update truck', 500, 'DATABASE_ERROR');
    }

    return successResponse({
      message: 'Truck updated successfully',
      truck,
    });
  } catch (error) {
    console.error('[PUT /api/trucks/[id]] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to update truck',
      500,
      'INTERNAL_ERROR'
    );
  }
});

/**
 * DELETE /api/trucks/[id]
 * Delete a truck
 */
export const DELETE = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;
    const truckId = parseInt(id);

    if (isNaN(truckId)) {
      throw new APIError('Invalid truck ID', 400, 'VALIDATION_ERROR');
    }

    // Check if truck has inventory assigned to it
    const { data: locations, error: locationError } = await supabaseAdmin
      .from('inventory_locations')
      .select('id')
      .eq('truck_id', truckId)
      .limit(1);

    if (locationError) {
      console.error('[DELETE /api/trucks/[id]] Location check error:', locationError);
      throw new APIError('Failed to check truck inventory', 500, 'DATABASE_ERROR');
    }

    if (locations && locations.length > 0) {
      throw new APIError(
        'Cannot delete truck with inventory assigned. Please transfer or remove all items first.',
        400,
        'VALIDATION_ERROR'
      );
    }

    // Delete truck
    const { error } = await supabaseAdmin
      .from('trucks')
      .delete()
      .eq('id', truckId);

    if (error) {
      console.error('[DELETE /api/trucks/[id]] Database error:', error);
      throw new APIError('Failed to delete truck', 500, 'DATABASE_ERROR');
    }

    return successResponse({
      message: 'Truck deleted successfully',
    });
  } catch (error) {
    console.error('[DELETE /api/trucks/[id]] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to delete truck',
      500,
      'INTERNAL_ERROR'
    );
  }
});
