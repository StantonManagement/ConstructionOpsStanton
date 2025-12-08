import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse } from '@/lib/apiHelpers';

// PUT: Update draw status (Approve/Fund/Reject)
export const PUT = withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params; // draw_id
  
  if (!supabaseAdmin) return errorResponse('Service unavailable', 503);

  const body = await req.json();
  const { status, amount_approved, approval_date, funded_date, notes } = body;

  const updates: any = { status, notes };

  if (status === 'approved') {
    updates.amount_approved = amount_approved;
    updates.approval_date = approval_date || new Date().toISOString();
  } else if (status === 'funded') {
    updates.funded_date = funded_date || new Date().toISOString();
  }

  const { data: draw, error } = await supabaseAdmin
    .from('loan_draws')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  return successResponse({ draw });
});





