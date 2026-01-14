import { NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';
import { supabaseAdmin } from '@/lib/supabaseClient';

// GET /api/funding-sources/[id]
export const GET = withAuth(async (
  request: NextRequest,
  { params }: { params: { id: string } },
  user: any
) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Database not available', 500, 'DB_ERROR');
    }

    const { id } = params;

    const { data, error } = await supabaseAdmin
      .from('funding_sources')
      .select(`
        *,
        portfolio:portfolios (id, name, code)
      `)
      .eq('id', id)
      .single();

    if (error) throw new APIError(error.message, 404, 'NOT_FOUND');

    return successResponse({
      funding_source: {
        ...data,
        remaining: (data.commitment_amount || 0) - (data.drawn_amount || 0)
      }
    }, 200);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Internal server error', 500, 'UNKNOWN');
  }
});

// PUT /api/funding-sources/[id]
export const PUT = withAuth(async (
  request: NextRequest,
  { params }: { params: { id: string } },
  user: any
) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Database not available', 500, 'DB_ERROR');
    }

    const { id } = params;
    const body = await request.json();

    const allowedFields = [
      'portfolio_id', 'name', 'type', 'lender_name',
      'commitment_amount', 'drawn_amount', 'interest_rate',
      'maturity_date', 'loan_number', 'notes', 'is_active'
    ];

    const updates: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (updates.type && !['loan', 'grant', 'equity', 'other'].includes(updates.type)) {
      throw new APIError('Invalid type', 400, 'VALIDATION_ERROR');
    }

    const { data, error } = await supabaseAdmin
      .from('funding_sources')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        portfolio:portfolios (id, name, code)
      `)
      .single();

    if (error) throw new APIError(error.message, 500, 'UPDATE_ERROR');

    return successResponse({ funding_source: data }, 200);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Internal server error', 500, 'UNKNOWN');
  }
});

// DELETE /api/funding-sources/[id]
export const DELETE = withAuth(async (
  request: NextRequest,
  { params }: { params: { id: string } },
  user: any
) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Database not available', 500, 'DB_ERROR');
    }

    const { id } = params;

    // Check for existing loan draws against this funding source
    const { data: draws } = await supabaseAdmin
      .from('loan_draws')
      .select('id')
      .eq('funding_source_id', id)
      .limit(1);

    if (draws && draws.length > 0) {
      // Soft delete if has draws
      const { error } = await supabaseAdmin
        .from('funding_sources')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw new APIError(error.message, 500, 'DELETE_ERROR');

      return successResponse({ deleted: true, soft_delete: true }, 200);
    }

    // Hard delete if no draws
    const { error } = await supabaseAdmin
      .from('funding_sources')
      .delete()
      .eq('id', id);

    if (error) throw new APIError(error.message, 500, 'DELETE_ERROR');

    return successResponse({ deleted: true, soft_delete: false }, 200);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Internal server error', 500, 'UNKNOWN');
  }
});
