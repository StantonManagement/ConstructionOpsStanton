import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * PATCH /api/users/[id]
 * Update user role/status (admin only)
 */
export const PATCH = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: unknown) => {
  try {
    if (!supabaseAdmin) throw new APIError('Service role client not available', 500, 'SERVER_ERROR');

    const callerUser = user as { id: string };
    const { data: callerRole } = await supabaseAdmin
      .from('user_role')
      .select('role')
      .eq('user_id', callerUser.id)
      .single();

    if (callerRole?.role !== 'admin') throw new APIError('Admin access required', 403, 'FORBIDDEN');

    const params = await context.params;
    const { id } = params;
    const body = await request.json();

    // Prevent self-demotion if last admin
    if (id === callerUser.id && body.role && body.role !== 'admin') {
      const { data: adminCount } = await supabaseAdmin
        .from('user_role')
        .select('user_id', { count: 'exact' })
        .eq('role', 'admin')
        .eq('status', 'active');
      if ((adminCount?.length || 0) <= 1) {
        throw new APIError('Cannot demote the last admin', 400, 'VALIDATION_ERROR');
      }
    }

    // Update user_role
    const roleUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.role !== undefined) roleUpdate.role = body.role;
    if (body.status !== undefined) roleUpdate.status = body.status;

    const { error: roleError } = await supabaseAdmin
      .from('user_role')
      .upsert({ user_id: id, ...roleUpdate }, { onConflict: 'user_id' });

    if (roleError) throw new APIError(roleError.message, 500, 'DATABASE_ERROR');

    // Update profile if provided
    if (body.first_name !== undefined || body.last_name !== undefined || body.phone !== undefined) {
      const profileUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.first_name !== undefined) profileUpdate.first_name = body.first_name;
      if (body.last_name !== undefined) profileUpdate.last_name = body.last_name;
      if (body.phone !== undefined) profileUpdate.phone = body.phone;

      await supabaseAdmin
        .from('user_profiles')
        .upsert({ user_id: id, ...profileUpdate }, { onConflict: 'user_id' });
    }

    return successResponse({ message: 'User updated successfully' });
  } catch (error) {
    if (error instanceof APIError) return errorResponse(error.message, error.statusCode, error.code);
    return errorResponse('Failed to update user', 500, 'INTERNAL_ERROR');
  }
});

/**
 * DELETE /api/users/[id]
 * Delete a user (admin only)
 */
export const DELETE = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: unknown) => {
  try {
    if (!supabaseAdmin) throw new APIError('Service role client not available', 500, 'SERVER_ERROR');

    const callerUser = user as { id: string };
    const { data: callerRole } = await supabaseAdmin
      .from('user_role')
      .select('role')
      .eq('user_id', callerUser.id)
      .single();

    if (callerRole?.role !== 'admin') throw new APIError('Admin access required', 403, 'FORBIDDEN');

    const params = await context.params;
    const { id } = params;

    if (id === callerUser.id) throw new APIError('Cannot delete your own account', 400, 'VALIDATION_ERROR');

    // Check if last admin
    const { data: targetRole } = await supabaseAdmin
      .from('user_role')
      .select('role')
      .eq('user_id', id)
      .single();

    if (targetRole?.role === 'admin') {
      const { data: adminCount } = await supabaseAdmin
        .from('user_role')
        .select('user_id', { count: 'exact' })
        .eq('role', 'admin');
      if ((adminCount?.length || 0) <= 1) {
        throw new APIError('Cannot delete the last admin', 400, 'VALIDATION_ERROR');
      }
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw new APIError(error.message, 500, 'DATABASE_ERROR');

    return successResponse({ message: 'User deleted successfully' });
  } catch (error) {
    if (error instanceof APIError) return errorResponse(error.message, error.statusCode, error.code);
    return errorResponse('Failed to delete user', 500, 'INTERNAL_ERROR');
  }
});
