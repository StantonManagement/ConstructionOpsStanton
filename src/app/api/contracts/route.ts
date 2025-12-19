import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * POST /api/contracts
 * Create a new contract with line items
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const { 
      project_id,
      subcontractor_id,
      contract_amount,
      contract_nickname,
      start_date,
      end_date,
      line_items = []
    } = body;

    // Validate required fields
    if (!project_id) {
      throw new APIError('Project ID is required', 400, 'VALIDATION_ERROR');
    }

    if (!subcontractor_id) {
      throw new APIError('Subcontractor ID is required', 400, 'VALIDATION_ERROR');
    }

    if (!contract_amount || isNaN(parseFloat(contract_amount)) || parseFloat(contract_amount) <= 0) {
      throw new APIError('Valid contract amount is required', 400, 'VALIDATION_ERROR');
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('id', parseInt(project_id))
      .single();

    if (projectError || !project) {
      throw new APIError('Project not found', 404, 'NOT_FOUND');
    }

    // Verify contractor exists
    const { data: contractor, error: contractorError } = await supabaseAdmin
      .from('contractors')
      .select('id')
      .eq('id', parseInt(subcontractor_id))
      .single();

    if (contractorError || !contractor) {
      throw new APIError('Contractor not found', 404, 'NOT_FOUND');
    }

    // Create contract
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .insert([{
        project_id: parseInt(project_id),
        subcontractor_id: parseInt(subcontractor_id),
        contract_amount: parseFloat(contract_amount),
        contract_nickname: contract_nickname?.trim() || null,
        start_date: start_date || null,
        end_date: end_date || null,
        status: 'active'
      }])
      .select()
      .single();

    if (contractError) {
      console.error('[Contracts API] Insert error:', contractError);
      throw new APIError(contractError.message || 'Failed to create contract', 500, 'DATABASE_ERROR');
    }

    // Create project_contractors entry if it doesn't exist
    const { data: existingProjectContractor } = await supabaseAdmin
      .from('project_contractors')
      .select('id')
      .eq('project_id', parseInt(project_id))
      .eq('contractor_id', parseInt(subcontractor_id))
      .single();

    if (!existingProjectContractor) {
      const { error: projectContractorError } = await supabaseAdmin
        .from('project_contractors')
        .insert({
          project_id: parseInt(project_id),
          contractor_id: parseInt(subcontractor_id),
          contract_amount: parseFloat(contract_amount),
          paid_to_date: 0,
          contract_status: 'active'
        });

      if (projectContractorError) {
        // Rollback contract creation
        await supabaseAdmin.from('contracts').delete().eq('id', contract.id);
        throw new APIError('Failed to create project contractor relationship', 500, 'DATABASE_ERROR');
      }
    }

    // Insert line items if provided
    if (line_items.length > 0) {
      const itemsToInsert = line_items.map((item: any, index: number) => ({
        contract_id: contract.id,
        project_id: parseInt(project_id),
        contractor_id: parseInt(subcontractor_id),
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
        // Rollback contract creation
        await supabaseAdmin.from('contracts').delete().eq('id', contract.id);
        throw new APIError('Failed to save line items', 500, 'DATABASE_ERROR');
      }
    }

    console.log(`[Contracts API] Created contract: ${contract.id}`);
    return successResponse({ contract }, 201);
  } catch (error) {
    console.error('[Contracts API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to create contract', 500, 'INTERNAL_ERROR');
  }
});

/**
 * GET /api/contracts
 * List all contracts with optional filters
 */
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const contractorId = searchParams.get('contractor_id');
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('contracts')
      .select(`
        *,
        project:projects(id, name),
        subcontractor:contractors(id, name, trade)
      `)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', parseInt(projectId));
    }

    if (contractorId) {
      query = query.eq('subcontractor_id', parseInt(contractorId));
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: contracts, error } = await query;

    if (error) {
      console.error('[Contracts API] Fetch error:', error);
      throw new APIError('Failed to fetch contracts', 500, 'DATABASE_ERROR');
    }

    return successResponse({ contracts: contracts || [] });
  } catch (error) {
    console.error('[Contracts API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch contracts', 500, 'INTERNAL_ERROR');
  }
});
