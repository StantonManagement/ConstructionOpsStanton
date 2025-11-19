import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  errorResponse, 
  APIError 
} from '@/lib/apiHelpers';
import type { CreateWarrantyRequest, WarrantyFilters } from '@/types/warranties';

/**
 * GET /api/warranties
 * List warranties with filters
 */
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const filters: WarrantyFilters = {
      project_id: searchParams.get('project_id') ? parseInt(searchParams.get('project_id')!) : undefined,
      contractor_id: searchParams.get('contractor_id') ? parseInt(searchParams.get('contractor_id')!) : undefined,
      status: searchParams.get('status') as any,
      expiring_days: searchParams.get('expiring_days') ? parseInt(searchParams.get('expiring_days')!) : undefined,
      search: searchParams.get('search') || undefined,
    };

    // Build query
    let query = supabaseAdmin
      .from('warranties')
      .select(`
        *,
        projects:project_id (id, name),
        contractors:contractor_id (id, name, trade)
      `)
      .order('end_date', { ascending: true });

    // Apply filters
    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id);
    }
    if (filters.contractor_id) {
      query = query.eq('contractor_id', filters.contractor_id);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.expiring_days) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + filters.expiring_days);
      query = query
        .gte('end_date', new Date().toISOString().split('T')[0])
        .lte('end_date', futureDate.toISOString().split('T')[0])
        .eq('status', 'active');
    }
    if (filters.search) {
      query = query.or(`coverage_description.ilike.%${filters.search}%,warranty_type.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Warranties API] Error fetching warranties:', error);
      throw new APIError('Failed to fetch warranties', 500, 'DATABASE_ERROR');
    }

    // Transform data and calculate days until expiration
    const warranties = data?.map((warranty: any) => {
      const endDate = new Date(warranty.end_date);
      const today = new Date();
      const days_until_expiration = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...warranty,
        project_name: warranty.projects?.name,
        contractor_name: warranty.contractors?.name,
        days_until_expiration,
      };
    }) || [];

    return successResponse({ warranties, count: warranties.length });
  } catch (error) {
    console.error('[Warranties API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch warranties', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/warranties
 * Create new warranty
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body: CreateWarrantyRequest = await request.json();

    // Validate required fields
    if (!body.project_id || !body.coverage_description || !body.start_date) {
      throw new APIError('Missing required fields', 400, 'VALIDATION_ERROR');
    }

    // Calculate end date if not provided
    let end_date = body.end_date;
    if (!end_date && body.duration_months) {
      const startDate = new Date(body.start_date);
      startDate.setMonth(startDate.getMonth() + body.duration_months);
      end_date = startDate.toISOString().split('T')[0];
    }

    if (!end_date) {
      throw new APIError('Either end_date or duration_months must be provided', 400, 'VALIDATION_ERROR');
    }

    // Calculate duration if not provided
    let duration_months = body.duration_months;
    if (!duration_months && end_date) {
      const start = new Date(body.start_date);
      const end = new Date(end_date);
      duration_months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    }

    // Create warranty
    const { data, error } = await supabaseAdmin
      .from('warranties')
      .insert({
        project_id: body.project_id,
        contractor_id: body.contractor_id,
        unit_number: body.unit_number,
        warranty_type: body.warranty_type,
        coverage_description: body.coverage_description,
        covered_items: body.covered_items,
        start_date: body.start_date,
        end_date,
        duration_months,
        warranty_document_url: body.warranty_document_url,
        receipt_url: body.receipt_url,
        exclusions: body.exclusions,
        claim_process: body.claim_process,
        notes: body.notes,
        created_by: user.id,
        status: new Date(body.start_date) <= new Date() ? 'active' : 'pending',
      })
      .select(`
        *,
        projects:project_id (id, name),
        contractors:contractor_id (id, name)
      `)
      .single();

    if (error) {
      console.error('[Warranties API] Error creating warranty:', error);
      throw new APIError('Failed to create warranty', 500, 'DATABASE_ERROR');
    }

    // Transform response
    const warranty = {
      ...data,
      project_name: data.projects?.name,
      contractor_name: data.contractors?.name,
    };

    // TODO: Schedule expiration reminders (30/60/90 days)

    return successResponse({ warranty }, 201);
  } catch (error) {
    console.error('[Warranties API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to create warranty', 500, 'INTERNAL_ERROR');
  }
});

