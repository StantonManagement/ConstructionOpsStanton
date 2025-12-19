import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';

/**
 * GET /api/contractors
 * List all contractors
 */
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const trade = searchParams.get('trade');

    let query = supabaseAdmin
      .from('contractors')
      .select('*')
      .order('name');

    if (status) {
      query = query.eq('status', status);
    }

    if (trade) {
      query = query.eq('trade', trade);
    }

    const { data: contractors, error } = await query;

    if (error) {
      console.error('[Contractors API] List error:', error);
      throw new APIError('Failed to fetch contractors', 500, 'DATABASE_ERROR');
    }

    return successResponse({ contractors });
  } catch (error) {
    console.error('[Contractors API] GET error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to fetch contractors', 500, 'INTERNAL_ERROR');
  }
});

/**
 * POST /api/contractors
 * Create a new contractor
 */
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const body = await request.json();
    const { name, trade, phone, email, status = 'active' } = body;

    // Validate required fields
    if (!name?.trim()) {
      throw new APIError('Contractor name is required', 400, 'VALIDATION_ERROR');
    }

    if (!trade?.trim()) {
      throw new APIError('Trade is required', 400, 'VALIDATION_ERROR');
    }

    // Create contractor
    const { data: contractor, error } = await supabaseAdmin
      .from('contractors')
      .insert([{
        name: name.trim(),
        trade: trade.trim(),
        phone: phone?.trim() || '',
        email: email?.trim() || '',
        status,
      }])
      .select()
      .single();

    if (error) {
      console.error('[Contractors API] Insert error:', error);
      throw new APIError(error.message || 'Failed to create contractor', 500, 'DATABASE_ERROR');
    }

    console.log(`[Contractors API] Created contractor: ${contractor.id} - ${contractor.name}`);
    return successResponse({ contractor }, 201);
  } catch (error) {
    console.error('[Contractors API] POST error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to create contractor', 500, 'INTERNAL_ERROR');
  }
});
