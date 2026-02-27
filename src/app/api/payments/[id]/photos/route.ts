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

/**
 * GET /api/payments/[id]/photos
 * Get all photos for a payment application
 */
export const GET = withAuth(async (request: NextRequest, context: any, user: any) => {
  try {
    if (!supabaseAdmin) {
      return errorResponse('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const paymentAppId = parseInt(params.id);

    if (!paymentAppId || isNaN(paymentAppId)) {
      return errorResponse('Valid payment application ID is required', 400, 'VALIDATION_ERROR');
    }

    // Fetch all photos for this payment application
    const { data, error } = await supabaseAdmin
      .from('photos')
      .select('*')
      .eq('payment_app_id', paymentAppId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Payment Photos GET] Error:', error);
      return errorResponse(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse({ photos: data || [], count: data?.length || 0 });
  } catch (error) {
    console.error('[Payment Photos GET] Exception:', error);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/payments/[id]/photos
 * Upload photo(s) for payment verification
 * Photos are linked to the payment application and optionally to specific line items
 */
export const POST = withAuth(async (request: NextRequest, context: any, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const paymentAppId = parseInt(params.id);

    if (!paymentAppId || isNaN(paymentAppId)) {
      throw new APIError('Valid payment application ID is required', 400, 'VALIDATION_ERROR');
    }

    // Get payment application to verify it exists and get project_id
    const { data: paymentApp, error: paymentError } = await supabaseAdmin
      .from('payment_applications')
      .select('project_id, contractor_id')
      .eq('id', paymentAppId)
      .single();

    if (paymentError || !paymentApp) {
      throw new APIError('Payment application not found', 404, 'NOT_FOUND');
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const line_item_id = formData.get('line_item_id') as string;
    const caption = formData.get('caption') as string;
    const photo_type = formData.get('photo_type') as string || 'verification';
    const location_description = formData.get('location_description') as string;

    if (!file) {
      throw new APIError('No file provided', 400, 'VALIDATION_ERROR');
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
    console.log('[Payment Photo Upload] EXIF data:', exifData);

    // Compress image
    const compressedBuffer = await compressImage(buffer);

    // Generate thumbnail
    const thumbnailBuffer = await generateThumbnail(compressedBuffer);

    // Get dimensions
    const dimensions = await getImageDimensions(compressedBuffer);

    // Generate unique filenames
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const photoFilename = `payments/${paymentApp.project_id}/${paymentAppId}/${timestamp}_${sanitizedName}`;
    const thumbnailFilename = `payments/${paymentApp.project_id}/${paymentAppId}/${timestamp}_thumb_${sanitizedName}`;

    // Upload to Supabase Storage
    const { data: photoUpload, error: photoError } = await supabaseAdmin.storage
      .from('construction-photos')
      .upload(photoFilename, compressedBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (photoError) {
      console.error('[Payment Photo Upload] Error uploading photo:', photoError);
      throw new APIError('Failed to upload photo', 500, 'STORAGE_ERROR');
    }

    const { data: thumbnailUpload, error: thumbnailError } = await supabaseAdmin.storage
      .from('construction-photos')
      .upload(thumbnailFilename, thumbnailBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (thumbnailError) {
      console.error('[Payment Photo Upload] Error uploading thumbnail:', thumbnailError);
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

    // Insert photo record
    const { data: photo, error: dbError } = await supabaseAdmin
      .from('photos')
      .insert({
        project_id: paymentApp.project_id,
        payment_app_id: paymentAppId,
        line_item_id: line_item_id ? parseInt(line_item_id) : null,
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
        visibility: 'internal',
        file_size: compressedBuffer.length,
        width: dimensions.width,
        height: dimensions.height,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Payment Photo Upload] Error inserting photo record:', dbError);

      // Clean up uploaded files
      await supabaseAdmin.storage.from('construction-photos').remove([photoFilename, thumbnailFilename]);

      throw new APIError('Failed to save photo metadata', 500, 'DATABASE_ERROR');
    }

    return successResponse({ photo }, 201);
  } catch (error) {
    console.error('[Payment Photos POST] Exception:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
});