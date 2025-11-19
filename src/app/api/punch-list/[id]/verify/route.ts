import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  errorResponse, 
  APIError 
} from '@/lib/apiHelpers';

/**
 * POST /api/punch-list/[id]/verify
 * Verify punch list item completion (final sign-off)
 */
export const POST = withAuth(async (request: NextRequest, { params }: { params: { id: string } }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const itemId = parseInt(params.id);

    // Check if item exists and is completed
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('punch_list_items')
      .select('id, status')
      .eq('id', itemId)
      .single();

    if (existingError || !existing) {
      throw new APIError('Punch list item not found', 404, 'NOT_FOUND');
    }

    if (existing.status !== 'completed') {
      throw new APIError('Item must be completed before verification', 400, 'INVALID_STATE');
    }

    // Update status to verified
    const { data, error } = await supabaseAdmin
      .from('punch_list_items')
      .update({
        status: 'verified',
        verified_date: new Date().toISOString(),
        verified_by: user.id,
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
      console.error('[Punch List API] Error verifying item:', error);
      throw new APIError('Failed to verify punch list item', 500, 'DATABASE_ERROR');
    }

    // Transform response
    const item = {
      ...data,
      project_name: data.projects?.name,
      contractor_name: data.contractors?.name,
      assigned_contractor_name: data.assigned_contractors?.name,
    };

    return successResponse({ item });
  } catch (error) {
    console.error('[Punch List API] Verify error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to verify punch list item', 500, 'INTERNAL_ERROR');
  }
});

