import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

/**
 * Change Order Approval API
 * POST /api/change-orders/[id]/approve - Approve a change order
 */

export async function POST(
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

    // Check if user is admin (simplified - enhance with role check)
    const { data: userRole } = await supabaseAdmin
      .from('user_role')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { comment } = body;

    // Fetch current change order
    const { data: changeOrder, error: fetchError } = await supabaseAdmin
      .from('change_orders')
      .select('*')
      .eq('id', parseInt(id))
      .single();

    if (fetchError || !changeOrder) {
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 });
    }

    if (changeOrder.status !== 'pending') {
      return NextResponse.json({ 
        error: `Cannot approve change order with status: ${changeOrder.status}` 
      }, { status: 400 });
    }

    // Update status to approved
    const { data: updatedCO, error: updateError } = await supabaseAdmin
      .from('change_orders')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_date: new Date().toISOString()
      })
      .eq('id', parseInt(id))
      .select()
      .single();

    if (updateError) {
      console.error('[CO Approve API] Error approving change order:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log approval (trigger will also log, but this is for explicit comment)
    if (comment) {
      await supabaseAdmin
        .from('change_order_approvals')
        .insert([{
          change_order_id: parseInt(id),
          approver_id: user.id,
          action: 'approved',
          comment: comment.trim()
        }]);
    }

    console.log('[CO Approve API] Approved change order:', id);
    return NextResponse.json({ 
      change_order: updatedCO,
      message: 'Change order approved successfully'
    }, { status: 200 });

  } catch (error: any) {
    console.error('[CO Approve API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

