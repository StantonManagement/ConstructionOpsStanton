import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/draws/[id]/line-items
 * List line items for a draw
 */
export const GET = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('draw_line_items')
      .select(`
        *,
        task:tasks (
          id,
          name,
          verified_at,
          estimated_cost,
          actual_cost
        ),
        budget_category:property_budgets (
          id,
          category
        )
      `)
      .eq('draw_id', id)
      .order('created_at');

    if (error) {
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch draw line items', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/draws/[id]/line-items
 * Add a task to a draw
 */
export const POST = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id: drawId } = await params;
    const body = await request.json();
    const { task_id } = body;

    if (!task_id) {
      throw new APIError('task_id is required', 400, 'VALIDATION_ERROR');
    }

    // 1. Check draw status
    const { data: draw, error: drawError } = await supabaseAdmin
      .from('construction_draws')
      .select('status, project_id')
      .eq('id', drawId)
      .single();

    if (drawError || !draw) {
      throw new APIError('Draw not found', 404, 'NOT_FOUND');
    }

    if (draw.status !== 'draft') {
      throw new APIError('Cannot add items to a non-draft draw', 400, 'VALIDATION_ERROR');
    }

    // 2. Check task verification status and ownership
    // Also check if task is already in another draw (handled by DB unique constraint, but good to check or handle error)
    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select(`
        id, 
        status, 
        actual_cost, 
        estimated_cost, 
        budget_category_id,
        location:locations (project_id)
      `)
      .eq('id', task_id)
      .single();

    if (taskError || !task) {
      throw new APIError('Task not found', 404, 'NOT_FOUND');
    }

    if (task.status !== 'verified') {
      throw new APIError('Task must be verified to be included in a draw', 400, 'VALIDATION_ERROR');
    }

    // Check project match (task location project_id vs draw project_id)
    // location is joined, TS might infer array. Safe access.
    const location = Array.isArray(task.location) ? task.location[0] : task.location;
    const taskProjectId = location?.project_id;
    
    if (taskProjectId !== draw.project_id) {
       throw new APIError('Task does not belong to the same project as the draw', 400, 'VALIDATION_ERROR');
    }

    // 3. Insert line item
    const amount = task.actual_cost || task.estimated_cost || 0;
    
    const { data, error } = await supabaseAdmin
      .from('draw_line_items')
      .insert([{
        draw_id: drawId,
        task_id: task.id,
        budget_category_id: task.budget_category_id,
        amount: amount,
        description: `Verified task: ${task.id}` // Can be improved
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        throw new APIError('Task is already included in a draw', 400, 'VALIDATION_ERROR');
      }
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    // Update draw amount_requested (sum of line items) - Optional, can be done on submit or via trigger
    // But for UI responsiveness, we might want to update it.
    // However, the requirements say "Review total amount" before submit.
    // Let's rely on calculation or update it here.
    // We'll update it here to keep it in sync.
    
    // Calculate new total
    const { data: totalData } = await supabaseAdmin
        .from('draw_line_items')
        .select('amount')
        .eq('draw_id', drawId);
        
    const newTotal = (totalData || []).reduce((sum, item) => sum + Number(item.amount), 0);
    
    await supabaseAdmin
        .from('construction_draws')
        .update({ amount_requested: newTotal, updated_at: new Date().toISOString() })
        .eq('id', drawId);

    return successResponse(data, 201);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to add line item', 500, 'INTERNAL_ERROR');
  }
});

/**
 * DELETE /api/draws/[id]/line-items
 * Remove a task from a draw (by task_id or line_item_id? Requirements say "Remove task from draw")
 * Usually delete by line_item ID is cleaner. But let's support passing task_id in body if needed, or query param.
 * RESTful: DELETE /api/draws/[id]/line-items/[lineItemId]
 * But the file is route.ts at /api/draws/[id]/line-items.
 * So we expect DELETE with body `{ task_id }` or `{ line_item_id }`.
 * Standard DELETE usually doesn't have body.
 * Let's use search param `?line_item_id=xxx`.
 */
export const DELETE = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { id: drawId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const lineItemId = searchParams.get('line_item_id');

    if (!lineItemId) {
      throw new APIError('line_item_id is required', 400, 'VALIDATION_ERROR');
    }

    // 1. Check draw status
    const { data: draw, error: drawError } = await supabaseAdmin
      .from('construction_draws')
      .select('status')
      .eq('id', drawId)
      .single();

    if (drawError || !draw) {
      throw new APIError('Draw not found', 404, 'NOT_FOUND');
    }

    if (draw.status !== 'draft') {
      throw new APIError('Cannot remove items from a non-draft draw', 400, 'VALIDATION_ERROR');
    }

    // 2. Delete
    const { error } = await supabaseAdmin
      .from('draw_line_items')
      .delete()
      .eq('id', lineItemId)
      .eq('draw_id', drawId);

    if (error) {
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    // Update total
    const { data: totalData } = await supabaseAdmin
        .from('draw_line_items')
        .select('amount')
        .eq('draw_id', drawId);
        
    const newTotal = (totalData || []).reduce((sum, item) => sum + Number(item.amount), 0);
    
    await supabaseAdmin
        .from('construction_draws')
        .update({ amount_requested: newTotal, updated_at: new Date().toISOString() })
        .eq('id', drawId);

    return successResponse({ deleted: true });
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to remove line item', 500, 'INTERNAL_ERROR');
  }
});
