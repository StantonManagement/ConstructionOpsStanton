import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse } from '@/lib/apiHelpers';

// PUT: Update loan details
export const PUT = withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  
  if (!supabaseAdmin) return errorResponse('Service unavailable', 503);

  const body = await req.json();
  const { lender_name, loan_number, total_amount, close_date, maturity_date, interest_rate, status } = body;

  const { data: loan, error } = await supabaseAdmin
    .from('construction_loans')
    .update({
      lender_name,
      loan_number,
      total_amount,
      close_date,
      maturity_date,
      interest_rate,
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  return successResponse({ loan });
});


