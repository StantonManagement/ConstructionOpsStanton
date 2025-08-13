import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const runtime = 'nodejs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS as HeadersInit });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentAppId } = await params;
    const body = await request.json();
    const { recallNotes } = body;

    // Get current session for authorization
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: CORS_HEADERS });
    }

    // Get the payment application to check current status
    const { data: paymentApp, error: fetchError } = await supabase
      .from('payment_applications')
      .select('*')
      .eq('id', paymentAppId)
      .single();

    if (fetchError || !paymentApp) {
      return NextResponse.json({ error: 'Payment application not found' }, { status: 404, headers: CORS_HEADERS });
    }

    // Check if the payment application is approved
    if (paymentApp.status !== 'approved') {
      return NextResponse.json({ error: 'Only approved payment applications can be recalled' }, { status: 400, headers: CORS_HEADERS });
    }

    // Update the payment application status to 'recalled'
    const { data: updatedApp, error: updateError } = await supabase
      .from('payment_applications')
      .update({
        status: 'recalled',
        pm_notes: recallNotes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentAppId)
      .select()
      .single();

    if (updateError) {
      console.error('Error recalling payment application:', updateError);
      return NextResponse.json({ error: 'Failed to recall payment application' }, { status: 500, headers: CORS_HEADERS });
    }

    return NextResponse.json({
      message: 'Payment application recalled successfully',
      paymentApp: updatedApp
    }, { headers: CORS_HEADERS });

  } catch (error) {
    console.error('Error in recall payment application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
} 