import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/trucks
 * List all trucks with optional filtering
 */
export const GET = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('trucks')
      .select('*')
      .order('identifier', { ascending: true });

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data: trucks, error } = await query;

    if (error) {
      console.error('[GET /api/trucks] Database error:', error);
      throw new APIError('Failed to fetch trucks', 500, 'DATABASE_ERROR');
    }

    return successResponse({ trucks });
  } catch (error) {
    console.error('[GET /api/trucks] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch trucks',
      500,
      'INTERNAL_ERROR'
    );
  }
});

/**
 * POST /api/trucks
 * Create a new truck
 *
 * Body:
 * {
 *   "name": "Main Work Truck",
 *   "identifier": "Truck #1",
 *   "license_plate": "ABC-1234",
 *   "vin": "1HGBH41JXMN109186",
 *   "make": "Ford",
 *   "model": "F-150",
 *   "year": 2020,
 *   "status": "active",
 *   "notes": "Primary work truck"
 * }
 */
export const POST = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
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
      status = 'active',
      notes
    } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      throw new APIError('Truck name is required', 400, 'VALIDATION_ERROR');
    }

    if (!identifier || !identifier.trim()) {
      throw new APIError('Truck identifier is required', 400, 'VALIDATION_ERROR');
    }

    // Validate status
    const validStatuses = ['active', 'maintenance', 'retired'];
    if (status && !validStatuses.includes(status)) {
      throw new APIError(
        `Status must be one of: ${validStatuses.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    // Validate year if provided
    if (year && (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1)) {
      throw new APIError('Invalid year value', 400, 'VALIDATION_ERROR');
    }

    // Create truck
    const { data: truck, error } = await supabaseAdmin
      .from('trucks')
      .insert([
        {
          name: name.trim(),
          identifier: identifier.trim(),
          license_plate: license_plate?.trim() || null,
          vin: vin?.trim() || null,
          make: make?.trim() || null,
          model: model?.trim() || null,
          year: year || null,
          status,
          notes: notes?.trim() || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[POST /api/trucks] Database error:', error);
      if (error.code === '23505') {
        // Unique constraint violation
        throw new APIError('A truck with this identifier already exists', 400, 'DUPLICATE_ERROR');
      }
      throw new APIError('Failed to create truck', 500, 'DATABASE_ERROR');
    }

    return successResponse(
      {
        message: 'Truck created successfully',
        truck,
      },
      201
    );
  } catch (error) {
    console.error('[POST /api/trucks] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to create truck',
      500,
      'INTERNAL_ERROR'
    );
  }
});
