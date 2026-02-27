import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/action-items
 * List all action items with optional filters
 */
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const type = searchParams.get('type');
    const isStale = searchParams.get('is_stale');

    let query = supabaseAdmin
      .from('action_items')
      .select(`
        *,
        project:projects(id, name, current_phase),
        created_by_user:users!action_items_created_by_fkey(id, name, email),
        resolved_by_user:users!action_items_resolved_by_fkey(id, name, email)
      `)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', parseInt(priority));
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (isStale !== null && isStale !== undefined) {
      query = query.eq('is_stale', isStale === 'true');
    }

    const { data: items, error } = await query;

    if (error) {
      console.error('[Action Items API] List error:', error);
      throw new APIError('Failed to fetch action items', 500, 'DATABASE_ERROR');
    }

    return successResponse({ items });
  } catch (error) {
    console.error('[Action Items API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch action items', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/action-items
 * Create a new action item
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const {
      title,
      description,
      project_id,
      priority,
      type = 'follow_up',
      status = 'open',
      source = 'manual',
      waiting_on,
      follow_up_date,
    } = body;

    // Validate required fields
    if (!title?.trim()) {
      throw new APIError('Title is required', 400, 'VALIDATION_ERROR');
    }

    if (!project_id) {
      throw new APIError('Project ID is required', 400, 'VALIDATION_ERROR');
    }

    if (!priority || priority < 1 || priority > 5) {
      throw new APIError('Priority must be between 1 and 5', 400, 'VALIDATION_ERROR');
    }

    // Create action item
    const { data: item, error } = await supabaseAdmin
      .from('action_items')
      .insert([{
        title: title.trim(),
        description: description?.trim() || null,
        project_id: parseInt(project_id),
        priority: parseInt(priority),
        type,
        status,
        source,
        waiting_on: waiting_on?.trim() || null,
        follow_up_date: follow_up_date || null,
        created_by: user.id,
        last_touched_at: new Date().toISOString(),
      }])
      .select(`
        *,
        project:projects(id, name, current_phase)
      `)
      .single();

    if (error) {
      console.error('[Action Items API] Insert error:', error);
      throw new APIError(error.message || 'Failed to create action item', 500, 'DATABASE_ERROR');
    }

    console.log(`[Action Items API] Created action item: ${item.id} - ${item.title}`);
    return successResponse({ item }, 201);
  } catch (error) {
    console.error('[Action Items API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to create action item', 500, 'INTERNAL_ERROR');
  }
});
