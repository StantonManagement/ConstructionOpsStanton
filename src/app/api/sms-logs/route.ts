import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/sms-logs
 * List SMS logs with optional filtering
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const taskId = searchParams.get('task_id');
    
    let query = supabaseAdmin
      .from('sms_log')
      .select(`
        *,
        task:tasks (name, location:locations(name)),
        contractor:contractors (name)
      `)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (taskId) {
      query = query.eq('task_id', taskId);
    }

    const { data, error } = await query;

    if (error) {
      throw new APIError(error.message, 500, 'DATABASE_ERROR');
    }

    return successResponse(data);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch SMS logs', 500, 'INTERNAL_ERROR');
  }
});
