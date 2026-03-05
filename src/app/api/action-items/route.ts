import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/action-items
 * Fetch all action items with optional filtering
 *
 * Query params:
 * - project_id: Filter by project
 * - priority: Filter by priority (1-5)
 * - status: Filter by status
 * - type: Filter by type
 * - assigned_to: Filter by assigned user
 */
export const GET = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const priority = searchParams.get('priority');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const assignedTo = searchParams.get('assigned_to');

    let query = supabase
      .from('action_items')
      .select(`
        *,
        project:projects(id, name, type, status),
        assigned_to:assigned_to_user_id(id, email)
      `)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    // Apply filters
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (assignedTo) {
      query = query.eq('assigned_to_user_id', assignedTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GET /api/action-items] Database error:', error);
      throw new APIError('Failed to fetch action items', 500, 'DATABASE_ERROR');
    }

    return successResponse({
      action_items: data || [],
      total: data?.length || 0
    });
  } catch (error) {
    console.error('[GET /api/action-items] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch action items',
      500,
      'INTERNAL_ERROR'
    );
  }
});

/**
 * POST /api/action-items
 * Create a new action item
 *
 * Body:
 * {
 *   title: string (required)
 *   description?: string
 *   project_id: number (required)
 *   priority: 1-5 (required)
 *   type?: string
 *   status?: string
 *   assigned_to_user_id?: number
 *   waiting_on?: string
 *   follow_up_date?: string
 *   source?: 'manual' | 'auto'
 *   auto_trigger?: string
 * }
 */
export const POST = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    const authenticatedUser = user as { id: string };
    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.project_id || !body.priority) {
      throw new APIError(
        'Missing required fields: title, project_id, priority',
        400,
        'VALIDATION_ERROR'
      );
    }

    // Validate priority range
    if (body.priority < 1 || body.priority > 5) {
      throw new APIError('Priority must be between 1 and 5', 400, 'VALIDATION_ERROR');
    }

    const insertData = {
      title: body.title,
      description: body.description || null,
      project_id: body.project_id,
      priority: body.priority,
      type: body.type || 'general',
      status: body.status || 'open',
      assigned_to_user_id: body.assigned_to_user_id || authenticatedUser.id,
      waiting_on: body.waiting_on || null,
      follow_up_date: body.follow_up_date || null,
      source: body.source || 'manual',
      auto_trigger: body.auto_trigger || null,
    };

    const { data, error } = await supabase
      .from('action_items')
      .insert(insertData)
      .select(`
        *,
        project:projects(id, name, type, status),
        assigned_to:assigned_to_user_id(id, email)
      `)
      .single();

    if (error) {
      console.error('[POST /api/action-items] Database error:', error);
      throw new APIError('Failed to create action item', 500, 'DATABASE_ERROR');
    }

    return successResponse({ action_item: data }, 201);
  } catch (error) {
    console.error('[POST /api/action-items] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to create action item',
      500,
      'INTERNAL_ERROR'
    );
  }
});
