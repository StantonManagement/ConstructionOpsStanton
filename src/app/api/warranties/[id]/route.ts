import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  errorResponse, 
  APIError 
} from '@/lib/apiHelpers';
import type { UpdateWarrantyRequest } from '@/types/warranties';

/**
 * GET /api/warranties/[id]
 * Get warranty detail with claims
 */
export const GET = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const warrantyId = parseInt(params.id);

    // Fetch warranty
    const { data: warranty, error: warrantyError } = await supabaseAdmin
      .from('warranties')
      .select(`
        *,
        projects:project_id (id, name),
        contractors:contractor_id (id, name, trade, phone, email)
      `)
      .eq('id', warrantyId)
      .single();

    if (warrantyError || !warranty) {
      throw new APIError('Warranty not found', 404, 'NOT_FOUND');
    }

    // Fetch claims
    const { data: claims, error: claimsError } = await supabaseAdmin
      .from('warranty_claims')
      .select('*')
      .eq('warranty_id', warrantyId)
      .order('claim_date', { ascending: false });

    // Fetch reminders
    const { data: reminders, error: remindersError } = await supabaseAdmin
      .from('warranty_reminders')
      .select('*')
      .eq('warranty_id', warrantyId)
      .order('reminder_date', { ascending: true });

    // Calculate days until expiration
    const endDate = new Date(warranty.end_date);
    const today = new Date();
    const days_until_expiration = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Transform response
    const response = {
      ...warranty,
      project_name: warranty.projects?.name,
      contractor: warranty.contractors,
      contractor_name: warranty.contractors?.name,
      days_until_expiration,
      claims: claims || [],
      reminders: reminders || [],
      claim_count: claims?.length || 0,
    };

    return successResponse({ warranty: response });
  } catch (error) {
    console.error('[Warranties API] GET detail error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch warranty', 500, 'INTERNAL_ERROR');
  }
});

/**
 * PUT /api/warranties/[id]
 * Update warranty
 */
export const PUT = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const warrantyId = parseInt(params.id);
    const body: UpdateWarrantyRequest = await request.json();

    // Check if warranty exists
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('warranties')
      .select('id, status')
      .eq('id', warrantyId)
      .single();

    if (existingError || !existing) {
      throw new APIError('Warranty not found', 404, 'NOT_FOUND');
    }

    // Recalculate end_date or duration if changed
    const updateData: any = { ...body };
    
    if (body.start_date && body.duration_months && !body.end_date) {
      const startDate = new Date(body.start_date);
      startDate.setMonth(startDate.getMonth() + body.duration_months);
      updateData.end_date = startDate.toISOString().split('T')[0];
    }

    if (body.start_date && body.end_date && !body.duration_months) {
      const start = new Date(body.start_date);
      const end = new Date(body.end_date);
      updateData.duration_months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    }

    // Update warranty
    const { data, error } = await supabaseAdmin
      .from('warranties')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', warrantyId)
      .select(`
        *,
        projects:project_id (id, name),
        contractors:contractor_id (id, name)
      `)
      .single();

    if (error) {
      console.error('[Warranties API] Error updating warranty:', error);
      throw new APIError('Failed to update warranty', 500, 'DATABASE_ERROR');
    }

    // Transform response
    const warranty = {
      ...data,
      project_name: data.projects?.name,
      contractor_name: data.contractors?.name,
    };

    return successResponse({ warranty });
  } catch (error) {
    console.error('[Warranties API] PUT error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to update warranty', 500, 'INTERNAL_ERROR');
  }
});

/**
 * DELETE /api/warranties/[id]
 * Delete warranty
 */
export const DELETE = withAuth(async (request: NextRequest, context: { params: Promise<{ id: string }> }, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const params = await context.params;
    const warrantyId = parseInt(params.id);

    const { error } = await supabaseAdmin
      .from('warranties')
      .delete()
      .eq('id', warrantyId);

    if (error) {
      console.error('[Warranties API] Error deleting warranty:', error);
      throw new APIError('Failed to delete warranty', 500, 'DATABASE_ERROR');
    }

    return successResponse({ message: 'Warranty deleted successfully' });
  } catch (error) {
    console.error('[Warranties API] DELETE error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to delete warranty', 500, 'INTERNAL_ERROR');
  }
});

