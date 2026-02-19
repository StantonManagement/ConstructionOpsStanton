import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * POST /api/users/invite
 * Invite a new user by email (admin only)
 */
export const POST = withAuth(async (request: NextRequest, context: unknown, user: unknown) => {
  try {
    if (!supabaseAdmin) throw new APIError('Service role client not available', 500, 'SERVER_ERROR');

    const callerUser = user as { id: string };
    const { data: callerRole } = await supabaseAdmin
      .from('user_role')
      .select('role')
      .eq('user_id', callerUser.id)
      .single();

    if (callerRole?.role !== 'admin') throw new APIError('Admin access required', 403, 'FORBIDDEN');

    const body = await request.json();
    const { email, role, first_name, last_name } = body;

    if (!email) throw new APIError('Email is required', 400, 'VALIDATION_ERROR');
    if (!role) throw new APIError('Role is required', 400, 'VALIDATION_ERROR');

    const validRoles = ['admin', 'staff'];
    if (!validRoles.includes(role)) {
      throw new APIError(`Role must be one of: ${validRoles.join(', ')}`, 400, 'VALIDATION_ERROR');
    }

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (emailExists) throw new APIError('A user with this email already exists', 400, 'DUPLICATE_EMAIL');

    // Create user via Supabase admin (sends invite email)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { first_name, last_name },
    });

    if (createError) throw new APIError(createError.message, 500, 'CREATE_USER_ERROR');
    if (!newUser?.user) throw new APIError('Failed to create user', 500, 'CREATE_USER_ERROR');

    // Assign role
    const { error: roleError } = await supabaseAdmin.from('user_role').insert({
      user_id: newUser.user.id,
      role,
      status: 'pending',
    });

    if (roleError) throw new APIError(roleError.message, 500, 'DATABASE_ERROR');

    // Create profile if name provided
    if (first_name || last_name) {
      await supabaseAdmin.from('user_profiles').insert({
        user_id: newUser.user.id,
        first_name: first_name || null,
        last_name: last_name || null,
      });
    }

    return successResponse({
      message: `Invitation sent to ${email}`,
      userId: newUser.user.id,
    }, 201);
  } catch (error) {
    if (error instanceof APIError) return errorResponse(error.message, error.statusCode, error.code);
    return errorResponse('Failed to invite user', 500, 'INTERNAL_ERROR');
  }
});
