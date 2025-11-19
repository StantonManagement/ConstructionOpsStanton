import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  errorResponse, 
  APIError 
} from '@/lib/apiHelpers';

/**
 * GET /api/projects/[id]
 * Fetch single project with full details
 */
export const GET = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const projectId = parseInt(params.id);

    if (isNaN(projectId)) {
      throw new APIError('Invalid project ID', 400, 'VALIDATION_ERROR');
    }

    // Fetch project with stats
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('[Projects API] Error fetching project:', projectError);
      throw new APIError('Project not found', 404, 'NOT_FOUND');
    }

    // Fetch additional stats
    const [contractorCount, paymentAppsCount, budgetData] = await Promise.all([
      // Count contractors
      supabaseAdmin
        .from('project_contractors')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('contract_status', 'active'),
      
      // Count payment applications
      supabaseAdmin
        .from('payment_applications')
        .select('id, status', { count: 'exact', head: true })
        .eq('project_id', projectId),
      
      // Sum contract amounts
      supabaseAdmin
        .from('project_contractors')
        .select('contract_amount, paid_to_date')
        .eq('project_id', projectId)
        .eq('contract_status', 'active')
    ]);

    const totalBudget = budgetData.data?.reduce((sum, c) => sum + (c.contract_amount || 0), 0) || 0;
    const totalSpent = budgetData.data?.reduce((sum, c) => sum + (c.paid_to_date || 0), 0) || 0;

    const enrichedProject = {
      ...project,
      stats: {
        totalContractors: contractorCount.count || 0,
        totalPaymentApps: paymentAppsCount.count || 0,
        totalBudget,
        totalSpent,
        completionPercentage: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
      }
    };

    return successResponse({ project: enrichedProject });
  } catch (error) {
    console.error('[Projects API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch project', 500, 'INTERNAL_ERROR');
  }
});

/**
 * PUT /api/projects/[id]
 * Update project details
 */
export const PUT = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const projectId = parseInt(params.id);

    if (isNaN(projectId)) {
      throw new APIError('Invalid project ID', 400, 'VALIDATION_ERROR');
    }

    // Check if project exists
    const { data: existingProject, error: existError } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (existError || !existingProject) {
      throw new APIError('Project not found', 404, 'NOT_FOUND');
    }

    // Parse update data
    const updates = await request.json();

    // Validate required fields if they're being updated
    if (updates.name !== undefined && !updates.name?.trim()) {
      throw new APIError('Project name is required', 400, 'VALIDATION_ERROR');
    }

    // Prepare update object (only include provided fields)
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Add fields that are being updated
    const allowedFields = [
      'name', 'client_name', 'address', 'current_phase', 'status',
      'start_date', 'target_completion_date', 'end_date', 'budget',
      'total_units', 'portfolio_name', 'at_risk', 'owner_entity_id'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // Perform update
    const { data: updatedProject, error: updateError } = await supabaseAdmin
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      console.error('[Projects API] Update error:', updateError);
      throw new APIError('Failed to update project', 500, 'DATABASE_ERROR');
    }

    console.log(`[Projects API] Updated project ${projectId}`);
    return successResponse({ project: updatedProject });

  } catch (error) {
    console.error('[Projects API] PUT error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to update project', 500, 'INTERNAL_ERROR');
  }
});

/**
 * DELETE /api/projects/[id]
 * Delete project (soft delete - sets status to 'deleted')
 */
export const DELETE = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const projectId = parseInt(params.id);

    if (isNaN(projectId)) {
      throw new APIError('Invalid project ID', 400, 'VALIDATION_ERROR');
    }

    // Check if project exists
    const { data: existingProject, error: existError } = await supabaseAdmin
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    if (existError || !existingProject) {
      throw new APIError('Project not found', 404, 'NOT_FOUND');
    }

    // Check for dependencies - contractors
    const { count: contractorCount } = await supabaseAdmin
      .from('project_contractors')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);

    if (contractorCount && contractorCount > 0) {
      throw new APIError(
        `Cannot delete project with ${contractorCount} associated contractor(s). Please remove contractors first.`,
        409,
        'HAS_DEPENDENCIES'
      );
    }

    // Check for dependencies - payment applications
    const { count: paymentAppCount } = await supabaseAdmin
      .from('payment_applications')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);

    if (paymentAppCount && paymentAppCount > 0) {
      throw new APIError(
        `Cannot delete project with ${paymentAppCount} payment application(s). Please remove payment applications first.`,
        409,
        'HAS_DEPENDENCIES'
      );
    }

    // Soft delete by setting status to 'deleted'
    const { error: deleteError } = await supabaseAdmin
      .from('projects')
      .update({ 
        status: 'deleted',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (deleteError) {
      console.error('[Projects API] Delete error:', deleteError);
      throw new APIError('Failed to delete project', 500, 'DATABASE_ERROR');
    }

    console.log(`[Projects API] Deleted project ${projectId} (${existingProject.name})`);
    return successResponse({ 
      message: 'Project deleted successfully',
      projectId 
    });

  } catch (error) {
    console.error('[Projects API] DELETE error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to delete project', 500, 'INTERNAL_ERROR');
  }
});
