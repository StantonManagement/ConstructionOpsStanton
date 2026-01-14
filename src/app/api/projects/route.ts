import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/projects
 * List all projects
 */
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Projects API] Query error:', error);
      throw new APIError(error.message || 'Failed to fetch projects', 500, 'DATABASE_ERROR');
    }

    return successResponse({ projects: projects || [] });
  } catch (error) {
    console.error('[Projects API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch projects', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/projects
 * Create a new project
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const { 
      name, 
      address, 
      client_name, 
      budget, 
      start_date, 
      target_completion_date, 
      status = 'active', 
      current_phase = 'Planning',
      owner_entity_id,
      portfolio_name,
      total_units,
      starting_balance
    } = body;

    // Validate required fields
    if (!name?.trim()) {
      throw new APIError('Project name is required', 400, 'VALIDATION_ERROR');
    }

    if (!address?.trim()) {
      throw new APIError('Address is required', 400, 'VALIDATION_ERROR');
    }

    if (!client_name?.trim()) {
      throw new APIError('Client name is required', 400, 'VALIDATION_ERROR');
    }

    // Create project
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .insert([{
        name: name.trim(),
        address: address.trim(),
        client_name: client_name.trim(),
        budget: budget ? parseFloat(budget) : null,
        start_date: start_date || null,
        target_completion_date: target_completion_date || null,
        status,
        current_phase,
        owner_entity_id: owner_entity_id ? parseInt(owner_entity_id) : null,
        portfolio_name: portfolio_name?.trim() || null,
        total_units: total_units ? parseInt(total_units) : 1,
        starting_balance: starting_balance ? parseFloat(starting_balance) : 0
      }])
      .select()
      .single();

    if (error) {
      console.error('[Projects API] Insert error:', error);
      throw new APIError(error.message || 'Failed to create project', 500, 'DATABASE_ERROR');
    }

    console.log(`[Projects API] Created project: ${project.id} - ${project.name}`);
    return successResponse({ project }, 201);
  } catch (error) {
    console.error('[Projects API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to create project', 500, 'INTERNAL_ERROR');
  }
});
