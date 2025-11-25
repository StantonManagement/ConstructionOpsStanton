import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  errorResponse, 
  APIError 
} from '@/lib/apiHelpers';

/**
 * POST /api/punch-list/[id]/reject
 * Reject completed work and reopen punch list item
 */
export const POST = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const itemId = parseInt(params.id);
    const body = await request.json();
    const { comment } = body;

    if (!comment) {
      throw new APIError('Rejection comment is required', 400, 'VALIDATION_ERROR');
    }

    // Check if item exists and is completed
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('punch_list_items')
      .select('id, status, assigned_to')
      .eq('id', itemId)
      .single();

    if (existingError || !existing) {
      throw new APIError('Punch list item not found', 404, 'NOT_FOUND');
    }

    if (existing.status !== 'completed') {
      throw new APIError('Only completed items can be rejected', 400, 'INVALID_STATE');
    }

    // Update status to rejected
    const { data, error } = await supabaseAdmin
      .from('punch_list_items')
      .update({
        status: 'rejected',
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
      console.error('[Punch List API] Error rejecting item:', error);
      throw new APIError('Failed to reject punch list item', 500, 'DATABASE_ERROR');
    }

    // Add rejection comment
    const { error: commentError } = await supabaseAdmin
      .from('punch_list_comments')
      .insert({
        punch_item_id: itemId,
        author_id: user.id,
        comment_text: `❌ Rejected: ${comment}`,
      });

    if (commentError) {
      console.error('[Punch List API] Error adding rejection comment:', commentError);
    }

    // Transform response
    const item = {
      ...data,
      project_name: data.projects?.name,
      contractor_name: data.contractors?.name,
      assigned_contractor_name: data.assigned_contractors?.name,
    };

    // TODO: Send notification to assigned contractor

    return successResponse({ item });
  } catch (error) {
    console.error('[Punch List API] Reject error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to reject punch list item', 500, 'INTERNAL_ERROR');
  }
});

