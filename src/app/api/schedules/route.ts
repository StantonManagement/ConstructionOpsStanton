import { NextResponse, NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse } from '@/lib/apiHelpers';
import { supabaseAdmin } from '@/lib/supabaseClient';

export const GET = withAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');

  if (!supabaseAdmin) {
    return errorResponse('Server misconfigured', 500);
  }

  let query = supabaseAdmin
    .from('project_schedules')
    .select(`
      *,
      projects (name)
    `);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error) {
    return errorResponse(error.message, 500);
  }

  return successResponse({ data });
});

export const POST = withAuth(async (request: NextRequest, _context: any, user: any) => {
  if (!supabaseAdmin) {
    return errorResponse('Server misconfigured', 500);
  }

  try {
    const body = await request.json();
    const { project_id, start_date, target_end_date } = body;

    if (!project_id || !start_date || !target_end_date) {
      return errorResponse('Missing required fields', 400);
    }

    // Check if schedule already exists for this project
    const { data: existing } = await supabaseAdmin
      .from('project_schedules')
      .select('id')
      .eq('project_id', project_id)
      .single();

    if (existing) {
      return errorResponse('Schedule already exists for this project', 409);
    }

    const { data, error } = await supabaseAdmin
      .from('project_schedules')
      .insert({
        project_id,
        start_date,
        target_end_date,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      return errorResponse(error.message, 500);
    }

    return successResponse({ data });
  } catch (error) {
    return errorResponse('Invalid request', 400);
  }
});
