import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/contracts/[id]
 * Fetch single contract with details
 */
export const GET = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const contractId = parseInt(params.id);

    if (isNaN(contractId)) {
      throw new APIError('Invalid contract ID', 400, 'VALIDATION_ERROR');
    }

    // Fetch contract with relations
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select(`
        *,
        project:projects(id, name),
        subcontractor:contractors(id, name, trade)
      `)
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      console.error('[Contracts API] Error fetching contract:', contractError);
      throw new APIError('Contract not found', 404, 'NOT_FOUND');
    }

    // Fetch line items
    const { data: lineItems, error: lineItemsError } = await supabaseAdmin
      .from('project_line_items')
      .select('*')
      .eq('contract_id', contractId)
      .order('display_order', { ascending: true });

    if (lineItemsError) {
      console.error('[Contracts API] Error fetching line items:', lineItemsError);
    }

    const enrichedContract = {
      ...contract,
      line_items: lineItems || []
    };

    return successResponse({ contract: enrichedContract });
  } catch (error) {
    console.error('[Contracts API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch contract', 500, 'INTERNAL_ERROR');
  }
});

/**
 * PUT /api/contracts/[id]
 * Update contract details
 */
export const PUT = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const contractId = parseInt(params.id);

    if (isNaN(contractId)) {
      throw new APIError('Invalid contract ID', 400, 'VALIDATION_ERROR');
    }

    // Check if contract exists
    const { data: existingContract, error: existError } = await supabaseAdmin
      .from('contracts')
      .select('id, project_id, subcontractor_id')
      .eq('id', contractId)
      .single();

    if (existError || !existingContract) {
      throw new APIError('Contract not found', 404, 'NOT_FOUND');
    }

    // Parse update data
    const body = await request.json();
    const { 
      project_id,
      subcontractor_id,
      contract_amount,
      contract_nickname,
      start_date,
      end_date,
      line_items
    } = body;

    // Validate if updating critical fields
    if (contract_amount !== undefined && (isNaN(parseFloat(contract_amount)) || parseFloat(contract_amount) <= 0)) {
      throw new APIError('Valid contract amount is required', 400, 'VALIDATION_ERROR');
    }

    // Prepare update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (project_id !== undefined) updateData.project_id = parseInt(project_id);
    if (subcontractor_id !== undefined) updateData.subcontractor_id = parseInt(subcontractor_id);
    if (contract_amount !== undefined) updateData.contract_amount = parseFloat(contract_amount);
    if (contract_nickname !== undefined) updateData.contract_nickname = contract_nickname?.trim() || null;
    if (start_date !== undefined) updateData.start_date = start_date || null;
    if (end_date !== undefined) updateData.end_date = end_date || null;

    // Update contract
    const { data: updatedContract, error: updateError } = await supabaseAdmin
      .from('contracts')
      .update(updateData)
      .eq('id', contractId)
      .select()
      .single();

    if (updateError) {
      console.error('[Contracts API] Update error:', updateError);
      throw new APIError('Failed to update contract', 500, 'DATABASE_ERROR');
    }

    // Update line items if provided
    if (line_items !== undefined && Array.isArray(line_items)) {
      // Delete existing line items
      await supabaseAdmin
        .from('project_line_items')
        .delete()
        .eq('contract_id', contractId);

      // Insert new line items
      if (line_items.length > 0) {
        const itemsToInsert = line_items.map((item: any, index: number) => ({
          contract_id: contractId,
          project_id: updatedContract.project_id,
          contractor_id: updatedContract.subcontractor_id,
          item_no: item.itemNo || index + 1,
          description_of_work: item.description || '',
          scheduled_value: parseFloat(item.scheduledValue) || 0,
          from_previous_application: parseFloat(item.fromPrevious) || 0,
          this_period: parseFloat(item.thisPeriod) || 0,
          material_presently_stored: parseFloat(item.materialStored) || 0,
          percent_gc: parseFloat(item.percentGC) || 0,
          display_order: index + 1,
          status: 'active'
        }));

        const { error: lineItemsError } = await supabaseAdmin
          .from('project_line_items')
          .insert(itemsToInsert);

        if (lineItemsError) {
          console.error('[Contracts API] Line items insert error:', lineItemsError);
          throw new APIError('Failed to update line items', 500, 'DATABASE_ERROR');
        }
      }
    }

    console.log(`[Contracts API] Updated contract ${contractId}`);
    return successResponse({ contract: updatedContract });

  } catch (error) {
    console.error('[Contracts API] PUT error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to update contract', 500, 'INTERNAL_ERROR');
  }
});

/**
 * DELETE /api/contracts/[id]
 * Delete contract (soft delete - sets status to 'cancelled')
 */
export const DELETE = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const contractId = parseInt(params.id);

    if (isNaN(contractId)) {
      throw new APIError('Invalid contract ID', 400, 'VALIDATION_ERROR');
    }

    // Check if contract exists
    const { data: existingContract, error: existError } = await supabaseAdmin
      .from('contracts')
      .select('id, contract_nickname')
      .eq('id', contractId)
      .single();

    if (existError || !existingContract) {
      throw new APIError('Contract not found', 404, 'NOT_FOUND');
    }

    // Check for dependencies - payment applications
    const { count: paymentAppCount } = await supabaseAdmin
      .from('payment_applications')
      .select('id', { count: 'exact', head: true })
      .eq('contract_id', contractId);

    if (paymentAppCount && paymentAppCount > 0) {
      throw new APIError(
        `Cannot delete contract with ${paymentAppCount} payment application(s). Please remove payment applications first.`,
        409,
        'HAS_DEPENDENCIES'
      );
    }

    // Soft delete by setting status to 'cancelled'
    const { error: deleteError } = await supabaseAdmin
      .from('contracts')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId);

    if (deleteError) {
      console.error('[Contracts API] Delete error:', deleteError);
      throw new APIError('Failed to delete contract', 500, 'DATABASE_ERROR');
    }

    console.log(`[Contracts API] Deleted contract ${contractId}`);
    return successResponse({ 
      message: 'Contract deleted successfully',
      contractId 
    });

  } catch (error) {
    console.error('[Contracts API] DELETE error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to delete contract', 500, 'INTERNAL_ERROR');
  }
});
