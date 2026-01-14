import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * POST /api/backlog/[id]/convert
 * Convert a backlog item to a project
 */
export const POST = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;
    const body = await request.json();
    const { property_id, name, budget, start_date, target_completion_date, description } = body;

    const { data: backlogItem, error: fetchError } = await supabaseAdmin
      .from('backlog_items')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !backlogItem) {
      throw new APIError('Backlog item not found', 404, 'NOT_FOUND');
    }

    if (backlogItem.status !== 'active') {
      throw new APIError('Can only convert active backlog items', 400, 'INVALID_STATUS');
    }

    if (!property_id) {
      throw new APIError('Property ID is required', 400, 'VALIDATION_ERROR');
    }

    if (backlogItem.scope_level === 'portfolio') {
      const { data: property } = await supabaseAdmin
        .from('properties')
        .select('portfolio_id')
        .eq('id', property_id)
        .single();

      if (property?.portfolio_id !== backlogItem.portfolio_id) {
        throw new APIError(
          'Property must be in the same portfolio as the backlog item',
          400,
          'PORTFOLIO_MISMATCH'
        );
      }
    }

    const projectData = {
      name: name || backlogItem.title,
      address: description || backlogItem.description || 'TBD',
      client_name: 'Internal',
      budget: budget || backlogItem.estimated_cost,
      start_date: start_date || null,
      target_completion_date: target_completion_date || null,
      status: 'planning',
      current_phase: 'Planning',
    };

    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert([projectData])
      .select()
      .single();

    if (projectError) {
      console.error('[Backlog API] Project creation error:', projectError);
      throw new APIError(projectError.message || 'Failed to create project', 500, 'PROJECT_CREATE_ERROR');
    }

    const { error: updateError } = await supabaseAdmin
      .from('backlog_items')
      .update({
        status: 'converted',
        converted_to_project_id: project.id,
      })
      .eq('id', id);

    if (updateError) {
      await supabaseAdmin.from('projects').delete().eq('id', project.id);
      throw new APIError(updateError.message || 'Failed to update backlog item', 500, 'UPDATE_ERROR');
    }

    console.log(`[Backlog API] Converted backlog item ${id} to project ${project.id}`);
    return successResponse({
      project,
      backlog_item: { ...backlogItem, status: 'converted', converted_to_project_id: project.id }
    }, 201);
  } catch (error) {
    console.error('[Backlog API] Convert error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to convert backlog item', 500, 'INTERNAL_ERROR');
  }
});
