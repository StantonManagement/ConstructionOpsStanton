import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

// GET - Fetch all users with roles, profiles, and status
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    // Verify the caller is an admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: callerRole } = await supabaseAdmin
      .from('user_role')
      .select('role')
      .eq('user_id', caller.id)
      .single();

    if (callerRole?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const roleFilter = searchParams.get('role') || '';
    const statusFilter = searchParams.get('status') || '';

    // Get all auth users
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get all user_role rows
    const { data: userRoles } = await supabaseAdmin
      .from('user_role')
      .select('user_id, role, status, last_login');

    // Get all user_profiles rows
    const { data: userProfiles } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, first_name, last_name, phone');

    const roleMap = new Map<string, { role: string; status: string; last_login: string | null }>();
    userRoles?.forEach((ur: { user_id: string; role: string; status: string; last_login: string | null }) => {
      roleMap.set(ur.user_id, { role: ur.role, status: ur.status || 'active', last_login: ur.last_login });
    });

    const profileMap = new Map<string, { first_name: string | null; last_name: string | null; phone: string | null }>();
    userProfiles?.forEach((p: { user_id: string; first_name: string | null; last_name: string | null; phone: string | null }) => {
      profileMap.set(p.user_id, { first_name: p.first_name, last_name: p.last_name, phone: p.phone });
    });

    // Build combined list
    let result = users.map((u) => {
      const roleData = roleMap.get(u.id);
      const profileData = profileMap.get(u.id);
      return {
        id: u.id,
        email: u.email ?? '',
        role: roleData?.role ?? null,
        status: roleData?.status ?? 'active',
        first_name: profileData?.first_name ?? null,
        last_name: profileData?.last_name ?? null,
        phone: profileData?.phone ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      };
    });

    // Apply filters
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((u) => {
        const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.toLowerCase();
        return name.includes(q) || u.email.toLowerCase().includes(q);
      });
    }
    if (roleFilter) {
      result = result.filter((u) => u.role === roleFilter);
    }
    if (statusFilter) {
      result = result.filter((u) => u.status === statusFilter);
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new user in auth.users and user_role table
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { email, password, name, role } = await request.json();

    // Validate required fields
    if (!email || !password || !name || !role) {
      return NextResponse.json({ 
        error: 'All fields (email, password, name, role) are required' 
      }, { status: 400 });
    }

    console.log('Creating user in Supabase Auth:', { email, name, role });

    // Create user in Supabase Auth with metadata
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        system_access: ['construction'] // Default system access
      }
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      return NextResponse.json({ 
        error: `Authentication error: ${authError.message}` 
      }, { status: 400 });
    }

    if (!authData.user) {
      console.error('No user data returned from Auth creation');
      return NextResponse.json({ 
        error: 'Failed to create user in authentication system' 
      }, { status: 500 });
    }

    console.log('User created successfully in auth.users:', authData.user.id);

    // Insert role into user_role table
    const { error: roleError } = await supabaseAdmin
      .from('user_role')
      .insert([{
        user_id: authData.user.id,
        role: role
      }]);

    if (roleError) {
      console.error('Role creation error:', roleError);
      
      // If role creation fails, delete the auth user
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        console.log('Auth user deleted after role creation failure');
      } catch (deleteError) {
        console.error('Failed to delete auth user after role creation failure:', deleteError);
      }
      
      return NextResponse.json({ 
        error: `Role assignment error: ${roleError.message}` 
      }, { status: 500 });
    }

    // Return the created user data
    const createdUser = {
      id: authData.user.id,
      email: authData.user.email,
      name: authData.user.user_metadata?.name || name,
      role: role,
      created_at: authData.user.created_at,
      is_active: true,
      uuid: authData.user.id
    };

    return NextResponse.json({ 
      success: true, 
      user: createdUser,
      message: `User "${name}" created successfully` 
    });
  } catch (error) {
    console.error('Unexpected error in user creation:', error);
    return NextResponse.json({ 
      error: 'Internal server error. Please try again.' 
    }, { status: 500 });
  }
}

// DELETE - Delete user from auth.users and user_role table
export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Delete from user_role table first
    const { error: roleError } = await supabaseAdmin
      .from('user_role')
      .delete()
      .eq('user_id', userId);

    if (roleError) {
      console.error('Role deletion error:', roleError);
      // Continue with auth deletion even if role deletion fails
    }

    // Delete user from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update user in auth.users and user_role table
export async function PUT(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { id, name, role, is_active } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Update user metadata in Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: {
        name
      },
      ...(is_active === false ? { ban_duration: '100000h' } : { ban_duration: '0' })
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update role in user_role table
    const { error: roleError } = await supabaseAdmin
      .from('user_role')
      .upsert([{
        user_id: id,
        role: role
      }], {
        onConflict: 'user_id'
      });

    if (roleError) {
      console.error('Role update error:', roleError);
      return NextResponse.json({ error: roleError.message }, { status: 500 });
    }

    const updatedUser = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name || name,
      role: role,
      created_at: data.user.created_at,
      is_active: is_active !== false, // Use the provided is_active value
      uuid: data.user.id
    };

    return NextResponse.json({ 
      success: true, 
      user: updatedUser,
      message: 'User updated successfully' 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
