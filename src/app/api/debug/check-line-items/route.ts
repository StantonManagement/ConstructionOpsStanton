import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseClient';

/**
 * Debug endpoint to check line items for a project/contractor
 * Usage: GET /api/debug/check-line-items?project_id=X&contractor_id=Y
 */
export async function GET(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('project_id');
  const contractorId = searchParams.get('contractor_id');
  const paymentAppId = searchParams.get('payment_app_id');

  if (paymentAppId) {
    // Check line items via payment app
    const { data: paymentApp } = await supabase
      .from('payment_applications')
      .select('project_id, contractor_id')
      .eq('id', paymentAppId)
      .single();

    if (!paymentApp) {
      return NextResponse.json({ error: 'Payment app not found' }, { status: 404 });
    }

    const { data: lineItems } = await supabase
      .from('project_line_items')
      .select('*')
      .eq('project_id', paymentApp.project_id)
      .eq('contractor_id', paymentApp.contractor_id);

    const { data: progress } = await supabase
      .from('payment_line_item_progress')
      .select('*')
      .eq('payment_app_id', paymentAppId);

    return NextResponse.json({
      project_id: paymentApp.project_id,
      contractor_id: paymentApp.contractor_id,
      payment_app_id: paymentAppId,
      line_items: lineItems || [],
      line_items_count: lineItems?.length || 0,
      progress_records: progress || [],
      progress_count: progress?.length || 0
    });
  }

  if (!projectId || !contractorId) {
    return NextResponse.json({
      error: 'project_id and contractor_id required, or payment_app_id'
    }, { status: 400 });
  }

  const { data: lineItems } = await supabase
    .from('project_line_items')
    .select('*')
    .eq('project_id', projectId)
    .eq('contractor_id', contractorId);

  return NextResponse.json({
    project_id: projectId,
    contractor_id: contractorId,
    line_items: lineItems || [],
    count: lineItems?.length || 0
  });
}
