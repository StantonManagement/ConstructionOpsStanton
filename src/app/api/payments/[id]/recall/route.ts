import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paymentAppId = params.id;
    const body = await request.json();
    const { recallNotes } = body;

    // Get current session for authorization
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get the payment application to check current status
    const { data: paymentApp, error: fetchError } = await supabase
      .from('payment_applications')
      .select('*')
      .eq('id', paymentAppId)
      .single();

    if (fetchError || !paymentApp) {
      return NextResponse.json({ error: 'Payment application not found' }, { status: 404 });
    }

    // Check if the payment application is approved
    if (paymentApp.status !== 'approved') {
      return NextResponse.json({ error: 'Only approved payment applications can be recalled' }, { status: 400 });
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
      return NextResponse.json({ error: 'Failed to recall payment application' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Payment application recalled successfully',
      paymentApp: updatedApp
    });

  } catch (error) {
    console.error('Error in recall payment application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 