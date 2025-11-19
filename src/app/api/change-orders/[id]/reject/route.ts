import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

/**
 * Change Order Rejection API
 * POST /api/change-orders/[id]/reject - Reject a change order
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

    // Check if user is admin
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

    if (!comment || !comment.trim()) {
      return NextResponse.json({ error: 'Comment is required for rejection' }, { status: 400 });
    }

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
        error: `Cannot reject change order with status: ${changeOrder.status}` 
      }, { status: 400 });
    }

    // Update status to rejected
    const { data: updatedCO, error: updateError } = await supabaseAdmin
      .from('change_orders')
      .update({
        status: 'rejected'
      })
      .eq('id', parseInt(id))
      .select()
      .single();

    if (updateError) {
      console.error('[CO Reject API] Error rejecting change order:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log rejection
    await supabaseAdmin
      .from('change_order_approvals')
      .insert([{
        change_order_id: parseInt(id),
        approver_id: user.id,
        action: 'rejected',
        comment: comment.trim()
      }]);

    console.log('[CO Reject API] Rejected change order:', id);
    return NextResponse.json({ 
      change_order: updatedCO,
      message: 'Change order rejected'
    }, { status: 200 });

  } catch (error: any) {
    console.error('[CO Reject API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

