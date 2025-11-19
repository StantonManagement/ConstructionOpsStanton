import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  errorResponse, 
  APIError 
} from '@/lib/apiHelpers';
import type { PhotoFilters } from '@/types/photos';

/**
 * GET /api/photos
 * List photos with filters
 */
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const filters: PhotoFilters = {
      project_id: searchParams.get('project_id') ? parseInt(searchParams.get('project_id')!) : undefined,
      punch_item_id: searchParams.get('punch_item_id') ? parseInt(searchParams.get('punch_item_id')!) : undefined,
      payment_app_id: searchParams.get('payment_app_id') ? parseInt(searchParams.get('payment_app_id')!) : undefined,
      photo_type: searchParams.get('photo_type') as any,
      visibility: searchParams.get('visibility') as any,
      uploaded_by: searchParams.get('uploaded_by') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      has_gps: searchParams.get('has_gps') === 'true' ? true : undefined,
    };

    // Parse tags if provided
    const tagsParam = searchParams.get('tags');
    if (tagsParam) {
      filters.tags = tagsParam.split(',').map(t => t.trim());
    }

    // Build query
    let query = supabaseAdmin
      .from('photos')
      .select(`
        *,
        projects:project_id (id, name)
      `)
      .order('timestamp', { ascending: false });

    // Apply filters
    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
    if (filters.punch_item_id) {
      query = query.eq('punch_item_id', filters.punch_item_id);
    }
    if (filters.payment_app_id) {
      query = query.eq('payment_app_id', filters.payment_app_id);
    }
    if (filters.photo_type) {
      query = query.eq('photo_type', filters.photo_type);
    }
    if (filters.visibility) {
      query = query.eq('visibility', filters.visibility);
    }
    if (filters.uploaded_by) {
      query = query.eq('uploaded_by', filters.uploaded_by);
    }
    if (filters.date_from) {
      query = query.gte('timestamp', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('timestamp', filters.date_to);
    }
    if (filters.has_gps) {
      query = query.not('gps_latitude', 'is', null);
    }
    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    // Apply visibility filter based on user
    query = query.or(`visibility.eq.public,visibility.eq.internal,and(visibility.eq.private,uploaded_by.eq.${user.id})`);

    const { data, error } = await query;

    if (error) {
      console.error('[Photos API] Error fetching photos:', error);
      throw new APIError('Failed to fetch photos', 500, 'DATABASE_ERROR');
    }

    // Transform data
    const photos = data?.map((photo: any) => ({
      ...photo,
      project_name: photo.projects?.name,
    })) || [];

    return successResponse({ photos, count: photos.length });
  } catch (error) {
    console.error('[Photos API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch photos', 500, 'INTERNAL_ERROR');
  }
});

