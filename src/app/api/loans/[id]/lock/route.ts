import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse } from '@/lib/apiHelpers';

// POST: Lock all budget items for a loan
export const POST = withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }, user: any) => {
  const { id } = await params;
  
  if (!supabaseAdmin) return errorResponse('Service unavailable', 503);

  // Update all items for this loan where locked_at is null
  const { data, error } = await supabaseAdmin
    .from('loan_budget_items')
    .update({
      locked_at: new Date().toISOString(),
      locked_by: user.id
    })
    .eq('loan_id', id)
    .is('locked_at', null)
    .select();

  if (error) return errorResponse(error.message, 500);

  return successResponse({ count: data.length });
});


