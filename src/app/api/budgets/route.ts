import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

/**
 * Property Budgets API
 * Manages budget line items for properties/projects
 */

// GET - Fetch budgets (optionally filtered by project)
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const useSummary = searchParams.get('summary') === 'true';

    // Build query
    if (useSummary) {
      // Use the view with calculated fields
      let query = supabaseAdmin
        .from('property_budgets_summary')
        .select('*')
        .order('display_order', { ascending: true })
        .order('category_name', { ascending: true });

      if (projectId) {
        query = query.eq('project_id', parseInt(projectId));
      }

      const { data: budgets, error } = await query;

      if (error) {
        console.error('[Budgets API] Error fetching budget summary:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ budgets: budgets || [] }, { status: 200 });
    } else {
      // Regular table query
      let query = supabaseAdmin
        .from('property_budgets')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('category_name', { ascending: true });

      if (projectId) {
        query = query.eq('project_id', parseInt(projectId));
      }

      const { data: budgets, error } = await query;

      if (error) {
        console.error('[Budgets API] Error fetching budgets:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ budgets: budgets || [] }, { status: 200 });
    }

  } catch (error: any) {
    console.error('[Budgets API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new budget line item
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_role')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole || userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      project_id,
      category_name,
      description,
      original_amount,
      display_order = 0,
      notes
    } = body;

    // Validate required fields
    if (!project_id || !category_name || original_amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields: project_id, category_name, original_amount' }, { status: 400 });
    }

    // Validate project exists
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Insert budget line item
    // revised_amount starts as same as original_amount
    const { data: newBudget, error: insertError } = await supabaseAdmin
      .from('property_budgets')
      .insert([{
        project_id: parseInt(project_id),
        category_name: category_name.trim(),
        description: description?.trim() || null,
        original_amount: parseFloat(original_amount),
        revised_amount: parseFloat(original_amount), // Starts same as original
        actual_spend: 0,
        committed_costs: 0,
        display_order: parseInt(display_order) || 0,
        notes: notes?.trim() || null,
        is_active: true
      }])
      .select()
      .single();

    if (insertError) {
      console.error('[Budgets API] Error creating budget:', insertError);
      
      // Check for unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'A budget category with this name already exists for this project' }, { status: 409 });
      }
      
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log('[Budgets API] Created budget line item:', newBudget.id);
    return NextResponse.json({ budget: newBudget }, { status: 201 });

  } catch (error: any) {
    console.error('[Budgets API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update budget line item
export async function PUT(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_role')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole || userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 });
    }

    // Remove fields that shouldn't be updated directly via this endpoint
    const { created_at, updated_at, project_id, ...safeUpdateData } = updateData;

    // Update budget
    const { data: updatedBudget, error: updateError } = await supabaseAdmin
      .from('property_budgets')
      .update(safeUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Budgets API] Error updating budget:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedBudget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    console.log('[Budgets API] Updated budget:', id);
    return NextResponse.json({ budget: updatedBudget }, { status: 200 });

  } catch (error: any) {
    console.error('[Budgets API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete budget line item (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_role')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole || userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 });
    }

    // Soft delete by setting is_active = false
    const { data: deletedBudget, error: deleteError } = await supabaseAdmin
      .from('property_budgets')
      .update({ is_active: false })
      .eq('id', parseInt(id))
      .select()
      .single();

    if (deleteError) {
      console.error('[Budgets API] Error deleting budget:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (!deletedBudget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    console.log('[Budgets API] Deleted (soft) budget:', id);
    return NextResponse.json({ message: 'Budget deleted successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('[Budgets API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

