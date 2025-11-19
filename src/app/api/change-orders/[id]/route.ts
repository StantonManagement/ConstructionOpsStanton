import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

/**
 * Change Order Detail API
 * GET /api/change-orders/[id] - Fetch single change order
 * PUT /api/change-orders/[id] - Update change order
 * DELETE /api/change-orders/[id] - Delete change order (draft only)
 */

// GET - Fetch single change order with details
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

    // Fetch change order from detail view
    const { data: changeOrder, error: coError } = await supabaseAdmin
      .from('change_orders_detail')
      .select('*')
      .eq('id', parseInt(id))
      .single();

    if (coError || !changeOrder) {
      console.error('[Change Order Detail API] Error fetching change order:', coError);
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 });
    }

    // Fetch photos
    const { data: photos, error: photosError } = await supabaseAdmin
      .from('change_order_photos')
      .select('*')
      .eq('change_order_id', parseInt(id))
      .order('display_order', { ascending: true });

    // Fetch approval history
    const { data: approvals, error: approvalsError } = await supabaseAdmin
      .from('change_order_approvals')
      .select(`
        *,
        approver:approver_id (
          raw_user_meta_data
        )
      `)
      .eq('change_order_id', parseInt(id))
      .order('created_at', { ascending: true });

    return NextResponse.json({ 
      change_order: changeOrder,
      photos: photos || [],
      approvals: approvals || []
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Change Order Detail API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update change order
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

    const body = await request.json();
    
    // Remove fields that shouldn't be updated directly
    const { id: _id, co_number, created_at, updated_at, created_by, project_id, ...updateData } = body;

    // Update change order
    const { data: updatedCO, error: updateError } = await supabaseAdmin
      .from('change_orders')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();

    if (updateError) {
      console.error('[Change Order Detail API] Error updating change order:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedCO) {
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 });
    }

    console.log('[Change Order Detail API] Updated change order:', id);
    return NextResponse.json({ change_order: updatedCO }, { status: 200 });

  } catch (error: any) {
    console.error('[Change Order Detail API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete change order (draft only)
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

    // Check current status
    const { data: changeOrder } = await supabaseAdmin
      .from('change_orders')
      .select('status, created_by')
      .eq('id', parseInt(id))
      .single();

    if (!changeOrder) {
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 });
    }

    if (changeOrder.status !== 'draft') {
      return NextResponse.json({ 
        error: 'Can only delete draft change orders' 
      }, { status: 403 });
    }

    // Delete change order (cascade will delete photos and approvals)
    const { error: deleteError } = await supabaseAdmin
      .from('change_orders')
      .delete()
      .eq('id', parseInt(id));

    if (deleteError) {
      console.error('[Change Order Detail API] Error deleting change order:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    console.log('[Change Order Detail API] Deleted change order:', id);
    return NextResponse.json({ message: 'Change order deleted successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('[Change Order Detail API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

