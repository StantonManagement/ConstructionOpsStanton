import { NextResponse } from "next/server";
import { supabaseAdmin, supabase } from "@/lib/supabaseClient";
import { canAccessPermissionsManagement } from "@/lib/permissions";

// GET - Fetch all permissions and role permissions
export async function GET(request: Request) {
  try {
    // Ensure admin client is available (should always be true in API routes)
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error: Admin client not available' },
        { status: 500 }
      );
    }
    
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

    // Fetch all permissions using admin client (bypass RLS for listing all available permissions)
    const { data: permissions, error: permError } = await supabaseAdmin
      .from("permissions")
      .select("*")
      .order("permission_category", { ascending: true })
      .order("permission_name", { ascending: true });

    if (permError) {
      console.error("Error fetching permissions:", permError);
      return NextResponse.json(
        { error: "Failed to fetch permissions" },
        { status: 500 }
      );
    }

    // Fetch all role permissions using admin client (bypass RLS for listing all role assignments)
    const { data: rolePermissions, error: rolePermError } = await supabaseAdmin
      .from("role_permissions_view")
      .select("*");

    if (rolePermError) {
      console.error("Error fetching role permissions:", rolePermError);
      return NextResponse.json(
        { error: "Failed to fetch role permissions" },
        { status: 500 }
      );
    }

    // Group by role
    const permissionsByRole = {
      admin: [] as string[],
      pm: [] as string[],
      staff: [] as string[]
    };

    rolePermissions?.forEach((rp: any) => {
      if (permissionsByRole[rp.role as keyof typeof permissionsByRole]) {
        permissionsByRole[rp.role as keyof typeof permissionsByRole].push(rp.permission_key);
      }
    });

    return NextResponse.json({
      permissions,
      rolePermissions: permissionsByRole
    });

  } catch (error) {
    console.error("Error in permissions GET endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update role permissions
export async function PUT(request: Request) {
  try {
    // Ensure admin client is available (should always be true in API routes)
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error: Admin client not available' },
        { status: 500 }
      );
    }
    
    // Verify user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json(
        { error: "Unauthorized - please log in" },
        { status: 401 }
      );
    }

    // Check if user has permission to manage permissions (admin only)
    const { data: userRole, error: roleError } = await supabase
      .from('user_role')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (roleError || !userRole || !canAccessPermissionsManagement(userRole.role)) {
      return NextResponse.json(
        { error: "Unauthorized - Only administrators can manage permissions" },
        { status: 403 }
      );
    }

    const { role, permissionKeys } = await request.json();

    if (!role || !Array.isArray(permissionKeys)) {
      return NextResponse.json(
        { error: "Invalid request - role and permissionKeys array required" },
        { status: 400 }
      );
    }

    if (!["admin", "pm", "staff"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role - must be admin, pm, or staff" },
        { status: 400 }
      );
    }

    // Get permission IDs for the given keys
    const { data: permissions, error: permError } = await supabase
      .from("permissions")
      .select("id, permission_key")
      .in("permission_key", permissionKeys);

    if (permError) {
      console.error("Error fetching permissions:", permError);
      return NextResponse.json(
        { error: "Failed to fetch permissions" },
        { status: 500 }
      );
    }

    // Delete existing permissions for this role (using service role)
    const { error: deleteError } = await supabaseAdmin
      .from("role_permissions")
      .delete()
      .eq("role", role);

    if (deleteError) {
      console.error("Error deleting old permissions:", deleteError);
      return NextResponse.json(
        { error: "Failed to update permissions" },
        { status: 500 }
      );
    }

    // Insert new permissions (using service role)
    if (permissions && permissions.length > 0) {
      const newRolePermissions = permissions.map((p: any) => ({
        role,
        permission_id: p.id,
        granted_by: session.user.id
      }));

      const { error: insertError } = await supabaseAdmin
        .from("role_permissions")
        .insert(newRolePermissions);

      if (insertError) {
        console.error("Error inserting new permissions:", insertError);
        return NextResponse.json(
          { error: "Failed to update permissions" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Permissions updated for ${role} role`
    });

  } catch (error) {
    console.error("Error in permissions PUT endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

