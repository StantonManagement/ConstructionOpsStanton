import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/draws/[id]
 * Get single draw details including line items
 */
export const GET = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('construction_draws')
      .select(`
        *,
        line_items:draw_line_items (
          id,
          amount,
          description,
          task:tasks (
            id,
            name,
            status,
            verified_at
          ),
          budget_category:property_budgets (
            id,
            category
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    if (!data) {
      throw new APIError('Draw not found', 404, 'NOT_FOUND');
    }

    return successResponse(data);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to get draw', 500, 'INTERNAL_ERROR');
  }
});

/**
 * PUT /api/draws/[id]
 * Update draw details (notes, etc)
 * Note: Status transitions should use specific endpoints or be careful here
 */
export const PUT = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;
    const body = await request.json();
    const { notes } = body;

    // Check status - only draft can be edited for basic fields usually
    // But maybe admin can edit notes anytime? Let's assume Draft only for now based on requirements "Draw cannot be modified after submitted"
    
    const { data: currentDraw } = await supabaseAdmin
        .from('construction_draws')
        .select('status')
        .eq('id', id)
        .single();
        
    if (currentDraw && currentDraw.status !== 'draft') {
        throw new APIError('Only draft draws can be modified', 400, 'VALIDATION_ERROR');
    }

    const { data, error } = await supabaseAdmin
      .from('construction_draws')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to update draw', 500, 'INTERNAL_ERROR');
  }
});

/**
 * DELETE /api/draws/[id]
 * Delete a draft draw
 */
export const DELETE = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;

    // Check status
    const { data: currentDraw } = await supabaseAdmin
        .from('construction_draws')
        .select('status')
        .eq('id', id)
        .single();
        
    if (currentDraw && currentDraw.status !== 'draft') {
        throw new APIError('Only draft draws can be deleted', 400, 'VALIDATION_ERROR');
    }

    const { error } = await supabaseAdmin
      .from('construction_draws')
      .delete()
      .eq('id', id);

    if (error) {
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to delete draw', 500, 'INTERNAL_ERROR');
  }
});
