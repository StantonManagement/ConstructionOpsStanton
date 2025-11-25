import { NextResponse, NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse } from '@/lib/apiHelpers';
import { supabaseAdmin } from '@/lib/supabaseClient';

export const GET = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  
  if (!supabaseAdmin) {
    return errorResponse('Server misconfigured', 500);
  }

  const { data, error } = await supabaseAdmin
    .from('schedule_milestones')
    .select('*')
    .eq('schedule_id', id)
    .order('target_date', { ascending: true });

  if (error) {
    return errorResponse(error.message, 500);
  }

  return successResponse({ data });
});

export const POST = withAuth(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }, user: any) => {
  const { id } = await params;

  if (!supabaseAdmin) {
    return errorResponse('Server misconfigured', 500);
  }

  try {
    const body = await request.json();
    const { name, target_date, status } = body;

    const { data, error } = await supabaseAdmin
      .from('schedule_milestones')
      .insert({
        schedule_id: id,
        name,
        target_date,
        status: status || 'pending',
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
