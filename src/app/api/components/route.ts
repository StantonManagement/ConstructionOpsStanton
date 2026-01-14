import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/components
 * List components with optional filters
 * Query params:
 *   - project_id: Filter to specific project
 *   - property_id: Filter to specific property
 *   - type: Filter by component type
 *   - status: Filter by status
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');
    const propertyId = searchParams.get('property_id');
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('components')
      .select(`
        *,
        project:projects!components_project_id_fkey (id, name, status),
        property:properties!components_property_id_fkey (id, name, address)
      `);

    if (projectId) query = query.eq('project_id', projectId);
    if (propertyId) query = query.eq('property_id', propertyId);
    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('name');

    if (error) {
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to list components', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/components
 * Create a new component
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const { project_id, property_id, name, type, unit_type, unit_number, floor } = body;

    if (!project_id) {
      throw new APIError('project_id is required', 400, 'VALIDATION_ERROR');
    }

    if (!property_id) {
      throw new APIError('property_id is required', 400, 'VALIDATION_ERROR');
    }

    if (!name) {
      throw new APIError('name is required', 400, 'VALIDATION_ERROR');
    }

    if (!type) {
      throw new APIError('type is required', 400, 'VALIDATION_ERROR');
    }

    const { data, error } = await supabaseAdmin
      .from('components')
      .insert([{
        project_id,
        property_id,
        name,
        type,
        unit_type: unit_type || null,
        unit_number: unit_number || null,
        floor: floor || null,
        status: 'not_started',
      }])
      .select(`
        *,
        project:projects!components_project_id_fkey (id, name, status),
        property:properties!components_property_id_fkey (id, name, address)
      `)
      .single();

    if (error) {
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data, 201);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to create component', 500, 'INTERNAL_ERROR');
  }
});
