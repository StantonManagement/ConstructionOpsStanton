import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS as HeadersInit });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const paymentAppId = id;
    const { rejectionNotes } = await req.json();

    if (!paymentAppId) {
      return NextResponse.json({ error: 'Payment application ID is required' }, { status: 400, headers: CORS_HEADERS });
    }

    // Get current user for rejection tracking
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401, headers: CORS_HEADERS });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: CORS_HEADERS });
    }

    // Get user details
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('uuid', user.id)
      .single();

    if (userDataError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: CORS_HEADERS });
    }

    // Update payment application status to rejected
    const { data: updatedApp, error: updateError } = await supabase
      .from('payment_applications')
      .update({
        status: 'rejected',
        rejected_by: userData.id,
        rejected_at: new Date().toISOString(),
        rejection_notes: rejectionNotes || null
      })
      .eq('id', paymentAppId)
      .select('*, project:projects(name), contractor:contractors(name, email)')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500, headers: CORS_HEADERS });
    }

    // Log the rejection action (if table exists)
    try {
      await supabase
        .from('payment_approval_logs')
        .insert({
          payment_app_id: paymentAppId,
          action: 'rejected',
          performed_by: userData.id,
          notes: rejectionNotes || 'Payment application rejected',
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.log('Note: payment_approval_logs table not found, skipping log entry');
    }

    console.log(`Payment application ${paymentAppId} rejected by ${userData.name}${rejectionNotes ? ' - Notes: ' + rejectionNotes : ''}`);

    return NextResponse.json({
      message: 'Payment application rejected successfully',
      paymentApp: updatedApp
    }, { headers: CORS_HEADERS });

  } catch (error) {
    console.error('Error rejecting payment application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}