import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse } from '@/lib/apiHelpers';

// POST: Bulk create/update budget items
export const POST = withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params; // loan_id
  
  if (!supabaseAdmin) return errorResponse('Service unavailable', 503);

  const body = await req.json();
  const { items } = body; // Array of items

  if (!Array.isArray(items)) {
    return errorResponse('Items array required', 400);
  }

  // Check if loan is locked to prevent editing "original_budget"
  const { data: loan } = await supabaseAdmin
    .from('construction_loans')
    .select('*') // We might need to check if items are locked, which is on the ITEM level per PRD "locked_at timestamp" on loan_budget_items table? 
                 // Wait, PRD says: "When 'Lock Budget' is clicked... Sets locked_at timestamp... Original Budget column becomes read-only"
                 // The lock seems to be global or per item. PRD: "locked_at timestamp and locked_by user" on loan_budget_items table.
                 // But the workflow "Lock Budget" sounds global. 
                 // Let's assume the lock is applied to ALL items at once or the table itself.
                 // Actually, the PRD schema shows `locked_at` on `loan_budget_items`.
                 // So we can check if individual items are locked.
                 // But the workflow implies a single action "Lock Budget".
    .eq('id', id)
    .single();

  // For this implementation, we'll iterate and upsert.
  // If an item has `locked_at`, we ignore `original_budget` changes?
  // Or we just update what's passed. Front-end should respect the lock.
  // Backend safety: check if locked.

  const results = [];
  const errors = [];

  for (const item of items) {
    try {
      if (item.id) {
        // Update existing
        // Check lock status if trying to change original budget
        if (item.original_budget !== undefined) {
          const { data: existing } = await supabaseAdmin
            .from('loan_budget_items')
            .select('locked_at, original_budget')
            .eq('id', item.id)
            .single();
          
          if (existing?.locked_at && Number(existing.original_budget) !== Number(item.original_budget)) {
            errors.push(`Cannot modify original budget for locked item ${item.category_name}`);
            continue;
          }
        }

        const { data: updated, error } = await supabaseAdmin
          .from('loan_budget_items')
          .update({
            category_name: item.category_name,
            original_budget: item.original_budget, // Only updates if not locked logic above passes
            notes: item.notes,
            display_order: item.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
          .select()
          .single();
        
        if (error) throw error;
        results.push(updated);

      } else {
        // Create new
        const { data: created, error } = await supabaseAdmin
          .from('loan_budget_items')
          .insert({
            loan_id: id,
            category_name: item.category_name,
            original_budget: item.original_budget,
            notes: item.notes,
            display_order: item.display_order
          })
          .select()
          .single();

        if (error) throw error;
        results.push(created);
      }
    } catch (e: any) {
      errors.push(e.message);
    }
  }

  if (errors.length > 0 && results.length === 0) {
    return errorResponse(errors.join(', '), 500);
  }

  return successResponse({ results, errors });
});




