import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse } from '@/lib/apiHelpers';

// GET: Fetch draws for a loan
export const GET = withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  
  if (!supabaseAdmin) return errorResponse('Service unavailable', 503);

  const { data: draws, error } = await supabaseAdmin
    .from('loan_draws')
    .select(`
      *,
      allocations:loan_draw_allocations(*)
    `)
    .eq('loan_id', id)
    .order('draw_number', { ascending: false });

  if (error) return errorResponse(error.message, 500);

  return successResponse({ draws });
});

// POST: Create a new draw request
export const POST = withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params; // loan_id
  
  if (!supabaseAdmin) return errorResponse('Service unavailable', 503);

  const body = await req.json();
  const { request_date, amount_requested, notes, allocations } = body;

  // Get next draw number
  const { count } = await supabaseAdmin
    .from('loan_draws')
    .select('*', { count: 'exact', head: true })
    .eq('loan_id', id);
  
  const drawNumber = (count || 0) + 1;

  // 1. Create Draw
  const { data: draw, error: drawError } = await supabaseAdmin
    .from('loan_draws')
    .insert({
      loan_id: id,
      draw_number: drawNumber,
      request_date,
      amount_requested,
      status: 'pending',
      notes
    })
    .select()
    .single();

  if (drawError) return errorResponse(drawError.message, 500);

  // 2. Create Allocations
  if (allocations && allocations.length > 0) {
    const allocationInserts = allocations.map((a: any) => ({
      draw_id: draw.id,
      budget_item_id: a.budget_item_id,
      amount: a.amount
    }));

    const { error: allocError } = await supabaseAdmin
      .from('loan_draw_allocations')
      .insert(allocationInserts);

    if (allocError) console.error('Error saving allocations:', allocError);
  }

  return successResponse({ draw });
});





