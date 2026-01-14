import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/locations
 * List locations, optionally filtered by project_id
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      throw new APIError('project_id is required', 400, 'VALIDATION_ERROR');
    }

    // Fetch locations
    // We also want to know task counts, but let's start with basic fetch.
    // Supabase can do count in a subquery or foreign table select if relationship is set up.
    // For now, we'll just fetch locations. 
    // If we need counts, we can use .select('*, tasks(count)') if foreign keys are detected by PostgREST,
    // but since we just created the table via SQL, we might need to refresh Supabase schema cache
    // or relationships might be inferred.
    
    const { data, error } = await supabaseAdmin
      .from('components')
      .select(`
        *,
        tasks (
          id,
          status
        )
      `)
      .eq('project_id', projectId)
      .order('name');

    if (error) {
      console.error('[Locations API] Fetch error:', error);
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    // Process data to add counts
    const locationsWithCounts = data?.map((loc: any) => {
      const tasks = loc.tasks || [];
      const completedCount = tasks.filter((t: any) => t.status === 'verified').length;
      
      // Remove the full tasks array to keep payload light, unless requested?
      // The type definition includes tasks?: Task[], so we can keep it or transform it.
      // For the list view, we usually just want counts.
      // But the frontend might expect the tasks array based on type definition.
      // Let's attach the counts to the object.
      
      const { tasks: _, ...locData } = loc; // Exclude tasks from the main object if we want lightweight
      
      // But wait, the Location interface has tasks?: Task[]. 
      // If we are listing locations, having the tasks might be heavy if there are many.
      // Let's return the simplified object + counts as per the type definition logic we added:
      // task_count?: number; completed_task_count?: number;
      
      return {
        ...locData,
        task_count: tasks.length,
        completed_task_count: completedCount
      };
    });

    return successResponse(locationsWithCounts || []);
  } catch (error) {
    console.error('[Locations API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch locations', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/locations
 * Create a new location
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const { 
      project_id, 
      name, 
      type, 
      unit_type, 
      unit_number, 
      floor, 
      status = 'not_started' 
    } = body;

    // Validation
    if (!project_id) throw new APIError('project_id is required', 400, 'VALIDATION_ERROR');
    if (!name?.trim()) throw new APIError('name is required', 400, 'VALIDATION_ERROR');
    if (!type) throw new APIError('type is required', 400, 'VALIDATION_ERROR');

    const { data, error } = await supabaseAdmin
      .from('components')
      .insert([{
        project_id,
        name: name.trim(),
        type,
        unit_type,
        unit_number,
        floor,
        status,
        tenant_id: '00000000-0000-0000-0000-000000000001' // Default tenant
      }])
      .select()
      .single();

    if (error) {
      console.error('[Locations API] Insert error:', error);
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data, 201);
  } catch (error) {
    console.error('[Locations API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to create location', 500, 'INTERNAL_ERROR');
  }
});
