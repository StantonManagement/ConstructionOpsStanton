import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

/**
 * Budget Line Item Detail API
 * GET /api/budgets/[id] - Fetch single budget with calculated fields
 * PUT /api/budgets/[id] - Update budget
 * DELETE /api/budgets/[id] - Delete budget
 */

// GET - Fetch single budget line item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { id } = await params;

    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Fetch budget from summary view (includes calculated fields)
    const { data: budget, error: budgetError } = await supabaseAdmin
      .from('property_budgets_summary')
      .select('*')
      .eq('id', parseInt(id))
      .single();

    if (budgetError || !budget) {
      console.error('[Budget Detail API] Error fetching budget:', budgetError);
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    return NextResponse.json({ budget }, { status: 200 });

  } catch (error: any) {
    console.error('[Budget Detail API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update budget line item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { id } = await params;

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
    
    // Remove fields that shouldn't be updated via this endpoint
    const { id: _id, created_at, updated_at, project_id, ...updateData } = body;

    // Update budget
    const { data: updatedBudget, error: updateError } = await supabaseAdmin
      .from('property_budgets')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();

    if (updateError) {
      console.error('[Budget Detail API] Error updating budget:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedBudget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    console.log('[Budget Detail API] Updated budget:', id);
    return NextResponse.json({ budget: updatedBudget }, { status: 200 });

  } catch (error: any) {
    console.error('[Budget Detail API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete budget line item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { id } = await params;

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

    // Soft delete by setting is_active = false
    const { data: deletedBudget, error: deleteError } = await supabaseAdmin
      .from('property_budgets')
      .update({ is_active: false })
      .eq('id', parseInt(id))
      .select()
      .single();

    if (deleteError) {
      console.error('[Budget Detail API] Error deleting budget:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (!deletedBudget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    console.log('[Budget Detail API] Deleted (soft) budget:', id);
    return NextResponse.json({ message: 'Budget deleted successfully', budget: deletedBudget }, { status: 200 });

  } catch (error: any) {
    console.error('[Budget Detail API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

