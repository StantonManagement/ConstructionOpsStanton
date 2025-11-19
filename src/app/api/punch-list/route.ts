import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  errorResponse, 
  APIError 
} from '@/lib/apiHelpers';
import type { PunchListFilters, CreatePunchListItemRequest } from '@/types/punch-list';

/**
 * GET /api/punch-list
 * List punch list items with filters
 */
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { searchParams } = new URL(request.url);
    
    // Parse filters from query params
    const filters: PunchListFilters = {
      project_id: searchParams.get('project_id') ? parseInt(searchParams.get('project_id')!) : undefined,
      contractor_id: searchParams.get('contractor_id') ? parseInt(searchParams.get('contractor_id')!) : undefined,
      status: searchParams.get('status') as any,
      severity: searchParams.get('severity') as any,
      assigned_to: searchParams.get('assigned_to') ? parseInt(searchParams.get('assigned_to')!) : undefined,
      overdue: searchParams.get('overdue') === 'true',
      search: searchParams.get('search') || undefined,
    };

    // Build query
    let query = supabaseAdmin
      .from('punch_list_items')
      .select(`
        *,
        projects:project_id (id, name),
        contractors:contractor_id (id, name),
        assigned_contractors:assigned_to (id, name)
      `)
      .order('created_at', { ascending: false });

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
    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }
    if (filters.overdue) {
      query = query.lt('due_date', new Date().toISOString().split('T')[0])
        .not('status', 'in', '(verified,completed)');
    }
    if (filters.search) {
      query = query.or(`description.ilike.%${filters.search}%,location.ilike.%${filters.search}%,item_number.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Punch List API] Error fetching items:', error);
      throw new APIError('Failed to fetch punch list items', 500, 'DATABASE_ERROR');
    }

    // Transform data to include joined fields
    const items = data?.map((item: any) => ({
      ...item,
      project_name: item.projects?.name,
      contractor_name: item.contractors?.name,
      assigned_contractor_name: item.assigned_contractors?.name,
    })) || [];

    return successResponse({ items, count: items.length });
  } catch (error) {
    console.error('[Punch List API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch punch list items', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/punch-list
 * Create new punch list item
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body: CreatePunchListItemRequest = await request.json();

    // Validate required fields
    if (!body.project_id || !body.description || !body.severity) {
      throw new APIError('Missing required fields', 400, 'VALIDATION_ERROR');
    }

    // Generate item number
    const { data: itemNumberData, error: itemNumberError } = await supabaseAdmin
      .rpc('generate_punch_item_number', { p_project_id: body.project_id });

    if (itemNumberError) {
      console.error('[Punch List API] Error generating item number:', itemNumberError);
      throw new APIError('Failed to generate item number', 500, 'DATABASE_ERROR');
    }

    const item_number = itemNumberData;

    // Calculate due date if not provided
    let due_date = body.due_date;
    if (!due_date) {
      const { data: dueDateData, error: dueDateError } = await supabaseAdmin
        .rpc('calculate_punch_due_date', { 
          p_severity: body.severity, 
          p_created_date: new Date().toISOString() 
        });

      if (!dueDateError && dueDateData) {
        due_date = dueDateData;
      }
    }

    // Create punch list item
    const { data, error } = await supabaseAdmin
      .from('punch_list_items')
      .insert({
        project_id: body.project_id,
        item_number,
        contractor_id: body.contractor_id,
        description: body.description,
        location: body.location,
        unit_number: body.unit_number,
        trade_category: body.trade_category,
        severity: body.severity,
        assigned_to: body.assigned_to,
        due_date,
        notes: body.notes,
        created_by: user.id,
        status: 'open',
      })
      .select(`
        *,
        projects:project_id (id, name),
        contractors:contractor_id (id, name),
        assigned_contractors:assigned_to (id, name)
      `)
      .single();

    if (error) {
      console.error('[Punch List API] Error creating item:', error);
      throw new APIError('Failed to create punch list item', 500, 'DATABASE_ERROR');
    }

    // Transform response
    const item = {
      ...data,
      project_name: data.projects?.name,
      contractor_name: data.contractors?.name,
      assigned_contractor_name: data.assigned_contractors?.name,
    };

    // TODO: Send notification to assigned contractor if assigned_to is set

    return successResponse({ item }, 201);
  } catch (error) {
    console.error('[Punch List API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to create punch list item', 500, 'INTERNAL_ERROR');
  }
});

