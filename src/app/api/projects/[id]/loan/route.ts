import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse } from '@/lib/apiHelpers';

// GET: Fetch loan, budget items, and draws for a project
export const GET = withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  
  if (!supabaseAdmin) return errorResponse('Service unavailable', 503);

  // 1. Fetch Loan
  const { data: loans, error: loanError } = await supabaseAdmin
    .from('construction_loans')
    .select('*')
    .eq('project_id', id);

  if (loanError) return errorResponse(loanError.message, 500);
  
  const loan = loans && loans.length > 0 ? loans[0] : null;

  if (!loan) {
    return successResponse({ loan: null });
  }

  // 2. Fetch Budget Items
  const { data: budgetItems, error: itemsError } = await supabaseAdmin
    .from('loan_budget_items')
    .select('*')
    .eq('loan_id', loan.id)
    .order('display_order', { ascending: true });

  if (itemsError) return errorResponse(itemsError.message, 500);

  // 3. Fetch Draws with Allocations
  // Note: Allocations might be better fetched separately if volume is high, but for now we fetch basic draw info here
  // and specific allocations on demand or joined.
  // Actually, for the main view, we want to know the "drawn" amount per budget item.
  // So we need allocations aggregated by budget_item_id.

  const { data: allocations, error: allocError } = await supabaseAdmin
    .from('loan_draw_allocations')
    .select('budget_item_id, amount, loan_draws!inner(status)')
    .eq('loan_draws.loan_id', loan.id)
    .eq('loan_draws.status', 'funded'); // Only funded draws count towards "drawn" amount usually? Or approved? 
                                        // PRD says "Drawn: $205,000". Typically means Funded. 
                                        // But "Available" might subtract "Approved" too?
                                        // Let's assume "Drawn" = Funded.
  
  if (allocError) console.error('Error fetching allocations:', allocError);

  // Calculate drawn amounts per item
  const drawnMap = new Map<number, number>();
  allocations?.forEach((a: any) => {
    const current = drawnMap.get(a.budget_item_id) || 0;
    drawnMap.set(a.budget_item_id, current + Number(a.amount));
  });

  const computedItems = budgetItems?.map((item: any) => {
    const drawn = drawnMap.get(item.id) || 0;
    const revised = Number(item.original_budget) + Number(item.approved_change_orders);
    return {
      ...item,
      revised_budget: revised,
      drawn_amount: drawn,
      remaining_amount: revised - drawn
    };
  });

  return successResponse({
    loan,
    budgetItems: computedItems || []
  });
});

// POST: Create a new loan for a project
export const POST = withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  
  if (!supabaseAdmin) return errorResponse('Service unavailable', 503);

  const body = await req.json();
  const { lender_name, loan_number, total_amount, close_date, maturity_date, interest_rate } = body;

  if (!lender_name || !total_amount) {
    return errorResponse('Missing required fields', 400);
  }

  // Check if loan already exists
  const { data: existing, error: checkError } = await supabaseAdmin
    .from('construction_loans')
    .select('id')
    .eq('project_id', id)
    .single();

  if (existing) {
    return errorResponse('Project already has a loan', 409);
  }

  const { data: loan, error } = await supabaseAdmin
    .from('construction_loans')
    .insert({
      project_id: id,
      lender_name,
      loan_number,
      total_amount,
      close_date,
      maturity_date,
      interest_rate,
      status: 'active'
    })
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  return successResponse({ loan });
});

// PUT: Update an existing loan
export const PUT = withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  
  if (!supabaseAdmin) return errorResponse('Service unavailable', 503);

  const body = await req.json();
  // Filter undefined values to only update provided fields
  const updates: any = {};
  
  if (body.lender_name !== undefined) updates.lender_name = body.lender_name;
  if (body.loan_number !== undefined) updates.loan_number = body.loan_number;
  if (body.total_amount !== undefined) updates.total_amount = body.total_amount;
  if (body.close_date !== undefined) updates.close_date = body.close_date;
  if (body.maturity_date !== undefined) updates.maturity_date = body.maturity_date;
  if (body.interest_rate !== undefined) updates.interest_rate = body.interest_rate;
  if (body.status !== undefined) updates.status = body.status;

  updates.updated_at = new Date().toISOString();

  // Verify loan exists for this project
  const { data: existing, error: checkError } = await supabaseAdmin
    .from('construction_loans')
    .select('id')
    .eq('project_id', id)
    .single();

  if (checkError || !existing) {
    return errorResponse('Loan not found for this project', 404);
  }

  const { data: loan, error } = await supabaseAdmin
    .from('construction_loans')
    .update(updates)
    .eq('id', existing.id)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  return successResponse({ loan });
});
