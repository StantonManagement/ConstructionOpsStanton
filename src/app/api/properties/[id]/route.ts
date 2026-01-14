import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/properties/[id]
 * Get a single property with optional includes
 */
export const GET = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const include = searchParams.get('include')?.split(',') || [];

    const { data: property, error } = await supabaseAdmin
      .from('properties')
      .select(`
        *,
        portfolio:portfolios (id, name, code)
      `)
      .eq('id', id)
      .single();

    if (error || !property) {
      throw new APIError('Property not found', 404, 'NOT_FOUND');
    }

    // Include projects if requested
    if (include.includes('projects')) {
      const { data: projectData } = await supabaseAdmin
        .from('components')
        .select(`
          project_id,
          project:projects!components_project_id_fkey (
            id,
            name,
            status,
            start_date,
            target_completion_date,
            budget,
            spent
          )
        `)
        .eq('property_id', id)
        .not('project_id', 'is', null);

      const uniqueProjects = projectData
        ? Array.from(new Map(projectData.map((item: any) => [item.project?.id, item.project])).values()).filter((p: any) => p !== null)
        : [];

      property.projects = uniqueProjects as any[];
    }

    // Include components if requested
    if (include.includes('components')) {
      const { data: components } = await supabaseAdmin
        .from('components')
        .select(`
          *,
          project:projects!components_project_id_fkey (id, name, status)
        `)
        .eq('property_id', id);

      property.components = components || [];
    }

    return successResponse(property);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch property', 500, 'INTERNAL_ERROR');
  }
});

/**
 * PATCH /api/properties/[id]
 * Update a property
 */
export const PATCH = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;
    const body = await request.json();
    const { name, address, owner_entity_id, unit_count } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (owner_entity_id !== undefined) updateData.owner_entity_id = owner_entity_id;
    if (unit_count !== undefined) updateData.unit_count = unit_count;

    const { data, error } = await supabaseAdmin
      .from('properties')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        portfolio:portfolios (id, name, code)
      `)
      .single();

    if (error) {
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to update property', 500, 'INTERNAL_ERROR');
  }
});
