import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  errorResponse, 
  APIError 
} from '@/lib/apiHelpers';
import { 
  compressImage, 
  generateThumbnail, 
  extractExifData, 
  getImageDimensions,
  isValidImageType,
  isValidImageSize 
} from '@/lib/image-utils';
import formidable from 'formidable';
import fs from 'fs/promises';
import path from 'path';

/**
 * POST /api/photos/upload
 * Upload photo with compression and EXIF extraction
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const project_id = formData.get('project_id') as string;
    const punch_item_id = formData.get('punch_item_id') as string;
    const payment_app_id = formData.get('payment_app_id') as string;
    const caption = formData.get('caption') as string;
    const photo_type = formData.get('photo_type') as string || 'general';
    const location_description = formData.get('location_description') as string;
    const visibility = formData.get('visibility') as string || 'internal';
    const tags = formData.get('tags') as string;

    if (!file) {
      throw new APIError('No file provided', 400, 'VALIDATION_ERROR');
    }

    if (!project_id) {
      throw new APIError('project_id is required', 400, 'VALIDATION_ERROR');
    }

    // Validate file type
    if (!isValidImageType(file.type)) {
      throw new APIError('Invalid image type. Supported: JPEG, PNG, WebP', 400, 'VALIDATION_ERROR');
    }

    // Validate file size
    if (!isValidImageSize(file.size)) {
      throw new APIError('Image too large. Maximum size: 20MB', 400, 'VALIDATION_ERROR');
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract EXIF metadata
    const exifData = await extractExifData(buffer);
    console.log('[Photo Upload] EXIF data:', exifData);

    // Compress image
    const compressedBuffer = await compressImage(buffer);

    // Generate thumbnail
    const thumbnailBuffer = await generateThumbnail(compressedBuffer);

    // Get dimensions
    const dimensions = await getImageDimensions(compressedBuffer);

    // Generate unique filenames
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const photoFilename = `${project_id}/${timestamp}_${sanitizedName}`;
    const thumbnailFilename = `${project_id}/${timestamp}_thumb_${sanitizedName}`;

    // Upload to Supabase Storage
    const { data: photoUpload, error: photoError } = await supabaseAdmin.storage
      .from('construction-photos')
      .upload(photoFilename, compressedBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (photoError) {
      console.error('[Photo Upload] Error uploading photo:', photoError);
      throw new APIError('Failed to upload photo', 500, 'STORAGE_ERROR');
    }

    const { data: thumbnailUpload, error: thumbnailError } = await supabaseAdmin.storage
      .from('construction-photos')
      .upload(thumbnailFilename, thumbnailBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (thumbnailError) {
      console.error('[Photo Upload] Error uploading thumbnail:', thumbnailError);
    }

    // Get public URLs
    const { data: { publicUrl: photoUrl } } = supabaseAdmin.storage
      .from('construction-photos')
      .getPublicUrl(photoFilename);

    const { data: { publicUrl: thumbnailUrl } } = supabaseAdmin.storage
      .from('construction-photos')
      .getPublicUrl(thumbnailFilename);

    // Prepare device info
    const userAgent = request.headers.get('user-agent') || '';
    const device_info = {
      browser: userAgent,
      device_model: exifData.model,
      device_make: exifData.make,
    };

    // Parse tags
    const tagsArray = tags ? tags.split(',').map((t: string) => t.trim()) : [];

    // Insert photo record
    const { data: photo, error: dbError } = await supabaseAdmin
      .from('photos')
      .insert({
        project_id: parseInt(project_id),
        punch_item_id: punch_item_id ? parseInt(punch_item_id) : null,
        payment_app_id: payment_app_id ? parseInt(payment_app_id) : null,
        photo_url: photoUrl,
        thumbnail_url: thumbnailUrl,
        caption,
        photo_type,
        gps_latitude: exifData.latitude,
        gps_longitude: exifData.longitude,
        location_description,
        timestamp: exifData.timestamp || new Date().toISOString(),
        uploaded_by: user.id,
        device_info,
        visibility,
        tags: tagsArray,
        file_size: compressedBuffer.length,
        width: dimensions.width,
        height: dimensions.height,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Photo Upload] Error inserting photo record:', dbError);
      
      // Clean up uploaded files
      await supabaseAdmin.storage.from('construction-photos').remove([photoFilename, thumbnailFilename]);
      
      throw new APIError('Failed to save photo metadata', 500, 'DATABASE_ERROR');
    }

    return successResponse({ photo }, 201);
  } catch (error) {
    console.error('[Photo Upload API] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to upload photo', 500, 'INTERNAL_ERROR');
  }
});

// Disable Next.js body parsing for multipart form data
export const config = {
  api: {
    bodyParser: false,
  },
};

