import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/locations/[id]
 * Get a single location with its tasks
 */
export const GET = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;

    if (!id) {
      throw new APIError('Location ID is required', 400, 'VALIDATION_ERROR');
    }

    const { data, error } = await supabaseAdmin
      .from('components')
      .select(`
        *,
        projects(name),
        tasks (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Location API] Fetch error:', error);
      if (error.code === 'PGRST116') {
        throw new APIError('Location not found', 404, 'NOT_FOUND');
      }
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    // Process tasks to ensure consistent return format
    // Sort tasks by sort_order or created_at
    if (data.tasks) {
      data.tasks.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    const payload = {
      ...data,
      property_name: (data as any).projects?.name || null,
    };

    return successResponse(payload);
  } catch (error) {
    console.error('[Location API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch location', 500, 'INTERNAL_ERROR');
  }
});

/**
 * PUT /api/locations/[id]
 * Update a location
 */
export const PUT = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;
    const body = await request.json();

    if (!id) {
      throw new APIError('Location ID is required', 400, 'VALIDATION_ERROR');
    }

    // Extract allowed fields for update
    const { 
      name, 
      type, 
      unit_type, 
      unit_number, 
      floor, 
      status,
      blocked_reason,
      blocked_note,
      template_applied_id
    } = body;

    // Build update object with only present fields
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (unit_type !== undefined) updates.unit_type = unit_type;
    if (unit_number !== undefined) updates.unit_number = unit_number;
    if (floor !== undefined) updates.floor = floor;
    if (status !== undefined) updates.status = status;
    if (blocked_reason !== undefined) updates.blocked_reason = blocked_reason;
    if (blocked_note !== undefined) updates.blocked_note = blocked_note;
    if (template_applied_id !== undefined) updates.template_applied_id = template_applied_id;

    // Validation for blocked status
    if (status === 'on_hold' && updates.status && !blocked_reason && !body.blocked_reason) {
      // NOTE: strict check might be annoying if just updating name, 
      // but let's assume frontend sends full object or we don't validate cross-field dependencies on partial updates unless critical.
      // However, DB constraint check_blocked_reason enforces consistency.
    }

    const { data, error } = await supabaseAdmin
      .from('components')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Location API] Update error:', error);
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data);
  } catch (error) {
    console.error('[Location API] PUT error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to update location', 500, 'INTERNAL_ERROR');
  }
});

/**
 * DELETE /api/locations/[id]
 * Delete a location (cascades to tasks)
 */
export const DELETE = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;

    if (!id) {
      throw new APIError('Location ID is required', 400, 'VALIDATION_ERROR');
    }

    const { error } = await supabaseAdmin
      .from('components')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Location API] Delete error:', error);
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse({ deleted: true });
  } catch (error) {
    console.error('[Location API] DELETE error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to delete location', 500, 'INTERNAL_ERROR');
  }
});
