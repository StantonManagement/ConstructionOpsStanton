import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  errorResponse, 
  APIError 
} from '@/lib/apiHelpers';

/**
 * POST /api/punch-list/[id]/complete
 * Mark punch list item as completed
 */
export const POST = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const itemId = parseInt(params.id);

    // Check if item exists
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('punch_list_items')
      .select('id, status')
      .eq('id', itemId)
      .single();

    if (existingError || !existing) {
      throw new APIError('Punch list item not found', 404, 'NOT_FOUND');
    }

    // Validate status transition
    if (existing.status === 'verified') {
      throw new APIError('Cannot modify verified item', 400, 'INVALID_STATE');
    }

    // Update status to completed
    const { data, error } = await supabaseAdmin
      .from('punch_list_items')
      .update({
        status: 'completed',
        completed_date: new Date().toISOString(),
        completed_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId)
      .select(`
        *,
        projects:project_id (id, name),
        contractors:contractor_id (id, name),
        assigned_contractors:assigned_to (id, name)
      `)
      .single();

    if (error) {
      console.error('[Punch List API] Error completing item:', error);
      throw new APIError('Failed to complete punch list item', 500, 'DATABASE_ERROR');
    }

    // Transform response
    const item = {
      ...data,
      project_name: data.projects?.name,
      contractor_name: data.contractors?.name,
      assigned_contractor_name: data.assigned_contractors?.name,
    };

    // TODO: Send notification to project manager

    return successResponse({ item });
  } catch (error) {
    console.error('[Punch List API] Complete error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to complete punch list item', 500, 'INTERNAL_ERROR');
  }
});

