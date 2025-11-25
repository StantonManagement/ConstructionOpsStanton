import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  errorResponse, 
  APIError 
} from '@/lib/apiHelpers';

/**
 * GET /api/punch-list/[id]/comments
 * Get all comments for a punch list item
 */
export const GET = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const itemId = parseInt(params.id);

    const { data: comments, error } = await supabaseAdmin
      .from('punch_list_comments')
      .select('*')
      .eq('punch_item_id', itemId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Punch List Comments API] Error fetching comments:', error);
      throw new APIError('Failed to fetch comments', 500, 'DATABASE_ERROR');
    }

    return successResponse({ comments: comments || [] });
  } catch (error) {
    console.error('[Punch List Comments API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch comments', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/punch-list/[id]/comments
 * Add a comment to a punch list item
 */
export const POST = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const itemId = parseInt(params.id);
    const body = await request.json();
    const { comment_text, attachment_url } = body;

    if (!comment_text) {
      throw new APIError('Comment text is required', 400, 'VALIDATION_ERROR');
    }

    // Check if punch list item exists
    const { data: item, error: itemError } = await supabaseAdmin
      .from('punch_list_items')
      .select('id, assigned_to')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      throw new APIError('Punch list item not found', 404, 'NOT_FOUND');
    }

    // Insert comment
    const { data: comment, error } = await supabaseAdmin
      .from('punch_list_comments')
      .insert({
        punch_item_id: itemId,
        author_id: user.id,
        comment_text,
        attachment_url,
      })
      .select()
      .single();

    if (error) {
      console.error('[Punch List Comments API] Error creating comment:', error);
      throw new APIError('Failed to create comment', 500, 'DATABASE_ERROR');
    }

    // TODO: Send notification to assigned contractor

    return successResponse({ comment }, 201);
  } catch (error) {
    console.error('[Punch List Comments API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to create comment', 500, 'INTERNAL_ERROR');
  }
});

