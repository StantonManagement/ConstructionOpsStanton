import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  errorResponse, 
  APIError 
} from '@/lib/apiHelpers';
import type { UpdatePunchListItemRequest } from '@/types/punch-list';

/**
 * GET /api/punch-list/[id]
 * Get punch list item detail with comments and photos
 */
export const GET = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const itemId = parseInt(params.id);

    // Fetch punch list item
    const { data: item, error: itemError } = await supabaseAdmin
      .from('punch_list_items')
      .select(`
        *,
        projects:project_id (id, name),
        contractors:contractor_id (id, name, trade, phone, email),
        assigned_contractors:assigned_to (id, name, trade, phone, email)
      `)
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      throw new APIError('Punch list item not found', 404, 'NOT_FOUND');
    }

    // Fetch comments
    const { data: comments, error: commentsError } = await supabaseAdmin
      .from('punch_list_comments')
      .select('*')
      .eq('punch_item_id', itemId)
      .order('created_at', { ascending: true });

    // Fetch photos
    const { data: photos, error: photosError } = await supabaseAdmin
      .from('photos')
      .select('*')
      .eq('punch_item_id', itemId)
      .order('timestamp', { ascending: false });

    // Transform response
    const response = {
      ...item,
      project_name: item.projects?.name,
      contractor_name: item.contractors?.name,
      contractor: item.contractors,
      assigned_contractor_name: item.assigned_contractors?.name,
      assigned_contractor: item.assigned_contractors,
      comments: comments || [],
      photos: photos || [],
      comment_count: comments?.length || 0,
      photo_count: photos?.length || 0,
    };

    return successResponse({ item: response });
  } catch (error) {
    console.error('[Punch List API] GET detail error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch punch list item', 500, 'INTERNAL_ERROR');
  }
});

/**
 * PUT /api/punch-list/[id]
 * Update punch list item
 */
export const PUT = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const itemId = parseInt(params.id);
    const body: UpdatePunchListItemRequest = await request.json();

    // Check if item exists
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('punch_list_items')
      .select('id, status')
      .eq('id', itemId)
      .single();

    if (existingError || !existing) {
      throw new APIError('Punch list item not found', 404, 'NOT_FOUND');
    }

    // Update item
    const { data, error } = await supabaseAdmin
      .from('punch_list_items')
      .update({
        ...body,
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
      console.error('[Punch List API] Error updating item:', error);
      throw new APIError('Failed to update punch list item', 500, 'DATABASE_ERROR');
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
    console.error('[Punch List API] PUT error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to update punch list item', 500, 'INTERNAL_ERROR');
  }
});

/**
 * DELETE /api/punch-list/[id]
 * Delete punch list item
 */
export const DELETE = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const itemId = parseInt(params.id);

    const { error } = await supabaseAdmin
      .from('punch_list_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('[Punch List API] Error deleting item:', error);
      throw new APIError('Failed to delete punch list item', 500, 'DATABASE_ERROR');
    }

    return successResponse({ message: 'Punch list item deleted successfully' });
  } catch (error) {
    console.error('[Punch List API] DELETE error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to delete punch list item', 500, 'INTERNAL_ERROR');
  }
});

