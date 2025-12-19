import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * POST /api/upload/verification-photo
 * Uploads a verification photo to Supabase Storage
 */
export const POST = withAuth(async (request: NextRequest, { params }: { params: any }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const taskId = formData.get('taskId') as string;
    const locationId = formData.get('locationId') as string;

    if (!file) {
      throw new APIError('No file provided', 400, 'VALIDATION_ERROR');
    }

    if (!taskId || !locationId) {
      throw new APIError('Task ID and Location ID are required', 400, 'VALIDATION_ERROR');
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new APIError('File must be an image', 400, 'VALIDATION_ERROR');
    }

    // Validate file size (e.g., max 5MB, though client should compress)
    if (file.size > 5 * 1024 * 1024) {
      throw new APIError('File size too large (max 5MB)', 400, 'VALIDATION_ERROR');
    }

    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${taskId}_${timestamp}.${fileExt}`;
    // Path structure: {location_id}/{filename} for easier browsing by location
    const filePath = `${locationId}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabaseAdmin
      .storage
      .from('verification-photos')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.error('[Upload API] Storage error:', error);
      throw new APIError(`Storage upload failed: ${error.message}`, 500, 'STORAGE_ERROR');
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('verification-photos')
      .getPublicUrl(filePath);

    return successResponse({ url: publicUrl });
  } catch (error) {
    console.error('[Upload API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to upload photo', 500, 'INTERNAL_ERROR');
  }
});
