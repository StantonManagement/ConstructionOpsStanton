import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key for admin operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// GET - Fetch all users from auth.users with their roles from user_role table
export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the token and get user info
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Check if the user has admin role
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_role')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole || !['admin', 'pm'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Unauthorized - Insufficient permissions' }, { status: 403 });
    }

    // Get users from Supabase Auth
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get roles from user_role table
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_role')
      .select('user_id, role');

    if (rolesError) {
      return NextResponse.json({ error: rolesError.message }, { status: 500 });
    }

    // Create a map of user_id to role
    const roleMap = new Map();
    userRoles?.forEach(ur => {
      roleMap.set(ur.user_id, ur.role);
    });

    // Transform auth users to match expected format
    const transformedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
      role: roleMap.get(user.id) || 'staff', // Get role from user_role table
      created_at: user.created_at,
      is_active: true, // Default to active since we're not using ban functionality
      uuid: user.id,
      last_sign_in: user.last_sign_in_at,
      email_confirmed: user.email_confirmed_at
    }));

    return NextResponse.json({ users: transformedUsers });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new user in auth.users and user_role table
export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json();

    // Validate required fields
    if (!email || !password || !name || !role) {
      return NextResponse.json({ 
        error: 'All fields (email, password, name, role) are required' 
      }, { status: 400 });
    }

    // Check if service role key is available
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
      return NextResponse.json({ 
        error: 'Server configuration error. Please contact administrator.' 
      }, { status: 500 });
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
