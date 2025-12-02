import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  errorResponse, 
  APIError 
} from '@/lib/apiHelpers';

/**
 * GET /api/contractors/[id]
 * Fetch single contractor with full details
 */
export const GET = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const contractorId = parseInt(params.id);

    if (isNaN(contractorId)) {
      throw new APIError('Invalid contractor ID', 400, 'VALIDATION_ERROR');
    }

    // Fetch contractor
    const { data: contractor, error: contractorError } = await supabaseAdmin
      .from('contractors')
      .select('*')
      .eq('id', contractorId)
      .single();

    if (contractorError || !contractor) {
      console.error('[Contractors API] Error fetching contractor:', contractorError);
      throw new APIError('Contractor not found', 404, 'NOT_FOUND');
    }

    // Fetch additional stats
    const [contractCount, paymentAppsCount] = await Promise.all([
      // Count contracts
      supabaseAdmin
        .from('project_contractors')
        .select('id', { count: 'exact', head: true })
        .eq('contractor_id', contractorId)
        .eq('contract_status', 'active'),
      
      // Count payment applications
      supabaseAdmin
        .from('payment_applications')
        .select('id', { count: 'exact', head: true })
        .eq('contractor_id', contractorId)
    ]);

    const enrichedContractor = {
      ...contractor,
      stats: {
        totalContracts: contractCount.count || 0,
        totalPaymentApps: paymentAppsCount.count || 0
      }
    };

    return successResponse({ contractor: enrichedContractor });
  } catch (error) {
    console.error('[Contractors API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch contractor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * PUT /api/contractors/[id]
 * Update contractor details
 */
export const PUT = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const contractorId = parseInt(params.id);

    if (isNaN(contractorId)) {
      throw new APIError('Invalid contractor ID', 400, 'VALIDATION_ERROR');
    }

    // Check if contractor exists
    const { data: existingContractor, error: existError } = await supabaseAdmin
      .from('contractors')
      .select('id')
      .eq('id', contractorId)
      .single();

    if (existError || !existingContractor) {
      throw new APIError('Contractor not found', 404, 'NOT_FOUND');
    }

    // Parse update data
    const updates = await request.json();

    // Validate required fields if they're being updated
    if (updates.name !== undefined && !updates.name?.trim()) {
      throw new APIError('Contractor name is required', 400, 'VALIDATION_ERROR');
    }

    if (updates.trade !== undefined && !updates.trade?.trim()) {
      throw new APIError('Trade is required', 400, 'VALIDATION_ERROR');
    }

    // Prepare update object (only include provided fields)
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Add fields that are being updated
    const allowedFields = [
      'name', 'trade', 'phone', 'email', 'status', 'performance_score',
      'address', 'city', 'state', 'zip', 'contact_name'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // Perform update
    const { data: updatedContractor, error: updateError } = await supabaseAdmin
      .from('contractors')
      .update(updateData)
      .eq('id', contractorId)
      .select()
      .single();

    if (updateError) {
      console.error('[Contractors API] Update error:', updateError);
      throw new APIError('Failed to update contractor', 500, 'DATABASE_ERROR');
    }

    console.log(`[Contractors API] Updated contractor ${contractorId}`);
    return successResponse({ contractor: updatedContractor });

  } catch (error) {
    console.error('[Contractors API] PUT error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to update contractor', 500, 'INTERNAL_ERROR');
  }
});

/**
 * DELETE /api/contractors/[id]
 * Delete contractor (soft delete - sets status to 'inactive')
 */
export const DELETE = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const contractorId = parseInt(params.id);

    if (isNaN(contractorId)) {
      throw new APIError('Invalid contractor ID', 400, 'VALIDATION_ERROR');
    }

    // Check if contractor exists
    const { data: existingContractor, error: existError } = await supabaseAdmin
      .from('contractors')
      .select('id, name')
      .eq('id', contractorId)
      .single();

    if (existError || !existingContractor) {
      throw new APIError('Contractor not found', 404, 'NOT_FOUND');
    }

    // Check for dependencies - contracts
    const { count: contractCount } = await supabaseAdmin
      .from('project_contractors')
      .select('id', { count: 'exact', head: true })
      .eq('contractor_id', contractorId);

    if (contractCount && contractCount > 0) {
      throw new APIError(
        `Cannot delete contractor with ${contractCount} associated contract(s). Please remove contracts first.`,
        409,
        'HAS_DEPENDENCIES'
      );
    }

    // Check for dependencies - payment applications
    const { count: paymentAppCount } = await supabaseAdmin
      .from('payment_applications')
      .select('id', { count: 'exact', head: true })
      .eq('contractor_id', contractorId);

    if (paymentAppCount && paymentAppCount > 0) {
      throw new APIError(
        `Cannot delete contractor with ${paymentAppCount} payment application(s). Please remove payment applications first.`,
        409,
        'HAS_DEPENDENCIES'
      );
    }

    // Soft delete by setting status to 'inactive'
    const { error: deleteError } = await supabaseAdmin
      .from('contractors')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', contractorId);

    if (deleteError) {
      console.error('[Contractors API] Delete error:', deleteError);
      throw new APIError('Failed to delete contractor', 500, 'DATABASE_ERROR');
    }

    console.log(`[Contractors API] Deleted contractor ${contractorId} (${existingContractor.name})`);
    return successResponse({ 
      message: 'Contractor deleted successfully',
      contractorId 
    });

  } catch (error) {
    console.error('[Contractors API] DELETE error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to delete contractor', 500, 'INTERNAL_ERROR');
  }
});







