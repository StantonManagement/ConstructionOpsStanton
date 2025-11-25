import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  errorResponse, 
  APIError 
} from '@/lib/apiHelpers';

/**
 * GET /api/photos/[id]
 * Get single photo detail
 */
export const GET = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const photoId = parseInt(params.id);

    const { data: photo, error } = await supabaseAdmin
      .from('photos')
      .select(`
        *,
        projects:project_id (id, name),
        punch_items:punch_item_id (id, item_number, description)
      `)
      .eq('id', photoId)
      .single();

    if (error || !photo) {
      throw new APIError('Photo not found', 404, 'NOT_FOUND');
    }

    // Check visibility permissions
    if (photo.visibility === 'private' && photo.uploaded_by !== user.id) {
      throw new APIError('Access denied', 403, 'FORBIDDEN');
    }

    // Fetch annotations
    const { data: annotations } = await supabaseAdmin
      .from('photo_annotations')
      .select('*')
      .eq('photo_id', photoId);

    const response = {
      ...photo,
      project_name: photo.projects?.name,
      annotations: annotations || [],
    };

    return successResponse({ photo: response });
  } catch (error) {
    console.error('[Photos API] GET detail error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch photo', 500, 'INTERNAL_ERROR');
  }
});

/**
 * PUT /api/photos/[id]
 * Update photo metadata (caption, tags, visibility, etc.)
 */
export const PUT = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const photoId = parseInt(params.id);
    const body = await request.json();

    // Check if photo exists and user has permission
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('photos')
      .select('id, uploaded_by')
      .eq('id', photoId)
      .single();

    if (existingError || !existing) {
      throw new APIError('Photo not found', 404, 'NOT_FOUND');
    }

    // Only uploader can edit (or admin - could add role check here)
    if (existing.uploaded_by !== user.id) {
      throw new APIError('Only the uploader can edit this photo', 403, 'FORBIDDEN');
    }

    // Update allowed fields only
    const { caption, tags, visibility, location_description, photo_type } = body;

    const { data, error } = await supabaseAdmin
      .from('photos')
      .update({
        caption,
        tags,
        visibility,
        location_description,
        photo_type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', photoId)
      .select()
      .single();

    if (error) {
      console.error('[Photos API] Error updating photo:', error);
      throw new APIError('Failed to update photo', 500, 'DATABASE_ERROR');
    }

    return successResponse({ photo: data });
  } catch (error) {
    console.error('[Photos API] PUT error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to update photo', 500, 'INTERNAL_ERROR');
  }
});

/**
 * DELETE /api/photos/[id]
 * Delete photo (removes from storage and database)
 */
export const DELETE = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const photoId = parseInt(params.id);

    // Get photo details
    const { data: photo, error: photoError } = await supabaseAdmin
      .from('photos')
      .select('id, uploaded_by, photo_url, thumbnail_url')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      throw new APIError('Photo not found', 404, 'NOT_FOUND');
    }

    // Check permission
    if (photo.uploaded_by !== user.id) {
      throw new APIError('Only the uploader can delete this photo', 403, 'FORBIDDEN');
    }

    // Extract filenames from URLs
    const photoFilename = photo.photo_url.split('/construction-photos/').pop();
    const thumbnailFilename = photo.thumbnail_url?.split('/construction-photos/').pop();

    // Delete from storage
    const filesToDelete = [photoFilename];
    if (thumbnailFilename) {
      filesToDelete.push(thumbnailFilename);
    }

    const { error: storageError } = await supabaseAdmin.storage
      .from('construction-photos')
      .remove(filesToDelete);

    if (storageError) {
      console.error('[Photos API] Error deleting from storage:', storageError);
      // Continue anyway - database record is more important
    }

    // Delete from database
    const { error: dbError } = await supabaseAdmin
      .from('photos')
      .delete()
      .eq('id', photoId);

    if (dbError) {
      console.error('[Photos API] Error deleting from database:', dbError);
      throw new APIError('Failed to delete photo', 500, 'DATABASE_ERROR');
    }

    return successResponse({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('[Photos API] DELETE error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to delete photo', 500, 'INTERNAL_ERROR');
  }
});

