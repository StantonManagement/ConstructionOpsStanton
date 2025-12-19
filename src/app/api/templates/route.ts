import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/templates
 * List templates, optionally filtered by is_active
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabaseAdmin
      .from('scope_templates')
      .select('*, template_tasks(count)')
      .order('name');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Templates API] Fetch error:', error);
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    // Transform count
    const templates = data?.map((t: any) => ({
      ...t,
      task_count: t.template_tasks?.[0]?.count || 0,
      template_tasks: undefined // Remove the count object
    }));

    return successResponse(templates || []);
  } catch (error) {
    console.error('[Templates API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch templates', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/templates
 * Create a new template
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const { name, description, unit_type } = body;

    if (!name?.trim()) {
      throw new APIError('Name is required', 400, 'VALIDATION_ERROR');
    }

    const { data, error } = await supabaseAdmin
      .from('scope_templates')
      .insert([{
        name: name.trim(),
        description,
        unit_type: unit_type || null,
        tenant_id: '00000000-0000-0000-0000-000000000001'
      }])
      .select()
      .single();

    if (error) {
      console.error('[Templates API] Create error:', error);
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data, 201);
  } catch (error) {
    console.error('[Templates API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to create template', 500, 'INTERNAL_ERROR');
  }
});
