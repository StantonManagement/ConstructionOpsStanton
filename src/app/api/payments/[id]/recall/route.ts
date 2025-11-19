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

    // Get current user for authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401, headers: CORS_HEADERS });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401, headers: CORS_HEADERS });
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
      return NextResponse.json({ 
        error: 'Failed to recall payment application', 
        details: updateError.message || updateError.toString() 
      }, { status: 500, headers: CORS_HEADERS });
    }

    // Rollback project budget and contractor paid_to_date
    if (paymentApp.current_period_value) {
      // Recalculate project spent excluding the recalled payment
      const { data: approvedPayments } = await supabase
        .from('payment_applications')
        .select('current_period_value')
        .eq('project_id', paymentApp.project_id)
        .eq('status', 'approved')
        .neq('id', paymentAppId);

      const totalSpent = (approvedPayments || []).reduce((sum, p) => sum + (p.current_period_value || 0), 0);
      
      await supabase
        .from('projects')
        .update({ spent: totalSpent })
        .eq('id', paymentApp.project_id);

      // Recalculate contractor paid_to_date excluding the recalled payment
      const { data: contractorPayments } = await supabase
        .from('payment_applications')
        .select('current_period_value')
        .eq('project_id', paymentApp.project_id)
        .eq('contractor_id', paymentApp.contractor_id)
        .eq('status', 'approved')
        .neq('id', paymentAppId);

      const contractorTotalPaid = (contractorPayments || []).reduce((sum, p) => sum + (p.current_period_value || 0), 0);
      
      await supabase
        .from('project_contractors')
        .update({ paid_to_date: contractorTotalPaid })
        .eq('project_id', paymentApp.project_id)
        .eq('contractor_id', paymentApp.contractor_id);

      console.log(`Rolled back budget for recalled payment ${paymentAppId}: project spent=${totalSpent}, contractor paid=${contractorTotalPaid}`);
    }

    // Rollback line item baselines to previous approved state
    const { data: lineItemProgress, error: lineItemError } = await supabase
      .from('payment_line_item_progress')
      .select('line_item_id')
      .eq('payment_app_id', paymentAppId);

    if (lineItemError) {
      console.error('Error fetching line item progress:', lineItemError);
      // Don't fail the recall if line item fetch fails, just log it
    } else if (lineItemProgress && lineItemProgress.length > 0) {
      // For each line item, find the previous approved percentage
      for (const progress of lineItemProgress) {
        try {
          const { data: approvedPayments, error: paymentsError } = await supabase
            .from('payment_applications')
            .select('id, approved_at')
            .eq('project_id', paymentApp.project_id)
            .eq('contractor_id', paymentApp.contractor_id)
            .eq('status', 'approved')
            .neq('id', paymentAppId)
            .order('approved_at', { ascending: false })
            .limit(1);

          if (paymentsError) {
            console.error(`Error fetching previous payments for line item ${progress.line_item_id}:`, paymentsError);
            continue;
          }

          let previousPercent = 0;
          if (approvedPayments && approvedPayments.length > 0) {
            const { data: prevProgress, error: prevError } = await supabase
              .from('payment_line_item_progress')
              .select('pm_verified_percent')
              .eq('payment_app_id', approvedPayments[0].id)
              .eq('line_item_id', progress.line_item_id)
              .single();
            
            if (prevError) {
              console.error(`Error fetching previous progress for line item ${progress.line_item_id}:`, prevError);
            } else {
              previousPercent = Number(prevProgress?.pm_verified_percent) || 0;
            }
          }

          // Revert line item to previous approved state
          const { error: updateError } = await supabase
            .from('project_line_items')
            .update({
              from_previous_application: previousPercent,
              percent_completed: previousPercent,
              updated_at: new Date().toISOString()
            })
            .eq('id', progress.line_item_id);

          if (updateError) {
            console.error(`Error updating line item ${progress.line_item_id}:`, updateError);
          }
        } catch (itemError) {
          console.error(`Exception processing line item ${progress.line_item_id}:`, itemError);
          // Continue with other line items
        }
      }
      
      console.log(`Rolled back ${lineItemProgress.length} line item baselines for recalled payment ${paymentAppId}`);
    } else {
      console.log(`No line item progress found for payment ${paymentAppId} (possibly $0 payment app)`);
    }

    return NextResponse.json({
      message: 'Payment application recalled successfully',
      paymentApp: updatedApp
    }, { headers: CORS_HEADERS });

  } catch (error) {
    console.error('Error in recall payment application:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500, headers: CORS_HEADERS }
    );
  }
} 