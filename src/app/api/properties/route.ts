import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/properties
 * List properties with optional filters
 * Query params:
 *   - portfolio_id: Filter to specific portfolio
 *   - include: Comma-separated list (projects, components)
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const searchParams = request.nextUrl.searchParams;
    const portfolioId = searchParams.get('portfolio_id');
    const include = searchParams.get('include')?.split(',') || [];

    let query = supabaseAdmin
      .from('properties')
      .select(`
        *,
        portfolio:portfolios (id, name, code)
      `);

    if (portfolioId) {
      query = query.eq('portfolio_id', portfolioId);
    }

    const { data: properties, error } = await query.order('name');

    if (error) {
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    // If include=projects, fetch projects for each property via components
    if (include.includes('projects')) {
      for (const property of properties) {
        const { data: projectData } = await supabaseAdmin
          .from('components')
          .select(`
            project_id,
            project:projects!components_project_id_fkey (
              id,
              name,
              status,
              start_date,
              target_completion_date
            )
          `)
          .eq('property_id', property.id)
          .not('project_id', 'is', null);

        // Deduplicate projects
        const uniqueProjects = projectData
          ? Array.from(new Map(projectData.map((item: any) => [item.project?.id, item.project])).values()).filter((p: any) => p !== null)
          : [];

        property.projects = uniqueProjects as any[];
      }
    }

    // If include=components, fetch components grouped by project
    if (include.includes('components')) {
      for (const property of properties) {
        const { data: components } = await supabaseAdmin
          .from('components')
          .select(`
            *,
            project:projects!components_project_id_fkey (id, name)
          `)
          .eq('property_id', property.id);

        property.components = components || [];
      }
    }

    return successResponse(properties);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to list properties', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/properties
 * Create a new property
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const { portfolio_id, name, address, owner_entity_id, unit_count } = body;

    if (!portfolio_id) {
      throw new APIError('portfolio_id is required', 400, 'VALIDATION_ERROR');
    }

    if (!name) {
      throw new APIError('name is required', 400, 'VALIDATION_ERROR');
    }

    const { data, error } = await supabaseAdmin
      .from('properties')
      .insert([{
        portfolio_id,
        name,
        address: address || null,
        owner_entity_id: owner_entity_id || null,
        unit_count: unit_count || 0,
      }])
      .select(`
        *,
        portfolio:portfolios (id, name, code)
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
    return errorResponse('Failed to create property', 500, 'INTERNAL_ERROR');
  }
});
