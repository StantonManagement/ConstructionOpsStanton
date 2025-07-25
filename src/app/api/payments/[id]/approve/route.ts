import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const paymentAppId = id;
    const { approvalNotes } = await req.json();

    if (!paymentAppId) {
      return NextResponse.json({ error: 'Payment application ID is required' }, { status: 400 });
    }

    // Get current user for approval tracking
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user details
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('uuid', user.id)
      .single();

    if (userDataError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update payment application status to approved
    const { data: updatedApp, error: updateError } = await supabase
      .from('payment_applications')
      .update({
        status: 'approved',
        approved_by: userData.id,
        approved_at: new Date().toISOString(),
        approval_notes: approvalNotes || null
      })
      .eq('id', paymentAppId)
      .select('*, project:projects(name), contractor:contractors(name, email)')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log the approval action (if table exists)
    try {
      await supabase
        .from('payment_approval_logs')
        .insert({
          payment_app_id: paymentAppId,
          action: 'approved',
          performed_by: userData.id,
          notes: approvalNotes || null,
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.log('Note: payment_approval_logs table not found, skipping log entry');
    }

    console.log(`Payment application ${paymentAppId} approved by ${userData.name}`);

    return NextResponse.json({
      message: 'Payment application approved successfully',
      paymentApp: updatedApp
    });

  } catch (error) {
    console.error('Error approving payment application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}