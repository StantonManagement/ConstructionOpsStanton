import { NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';
import { supabaseAdmin } from '@/lib/supabaseClient';

// GET /api/portfolios/[id] - Get single portfolio with details
export const GET = withAuth(async (
  request: NextRequest,
  context: any,
  user: any
) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Database not available', 500, 'DB_ERROR');
    }

    const { id } = await context.params;

    const { data, error } = await supabaseAdmin
      .from('portfolios')
      .select(`
        *,
        funding_sources (*),
        projects (
          id,
          name,
          status,
          address
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw new APIError(error.message, 404, 'NOT_FOUND');

    return successResponse({ portfolio: data }, 200);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Internal server error', 500, 'UNKNOWN');
  }
});

// PUT /api/portfolios/[id] - Update portfolio
export const PUT = withAuth(async (
  request: NextRequest,
  context: any,
  user: any
) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Database not available', 500, 'DB_ERROR');
    }

    const { id } = await context.params;
    const body = await request.json();
    const { name, code, description, owner_entity_id, is_active } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (code !== undefined) updates.code = code;
    if (description !== undefined) updates.description = description;
    if (owner_entity_id !== undefined) updates.owner_entity_id = owner_entity_id;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabaseAdmin
      .from('portfolios')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new APIError(error.message, 500, 'UPDATE_ERROR');

    return successResponse({ portfolio: data }, 200);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Internal server error', 500, 'UNKNOWN');
  }
});

// DELETE /api/portfolios/[id] - Soft delete (set is_active = false)
export const DELETE = withAuth(async (
  request: NextRequest,
  context: any,
  user: any
) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Database not available', 500, 'DB_ERROR');
    }

    const { id } = await context.params;

    // Check for active funding sources or projects
    const { data: portfolio } = await supabaseAdmin
      .from('portfolios')
      .select(`
        funding_sources (
          id,
          loan_draws (id)
        ),
        projects (id)
      `)
      .eq('id', id)
      .single();

    // Check if any funding source has loan draws (transitive check)
    const hasLoanDraws = portfolio?.funding_sources?.some(
      (fs: any) => fs.loan_draws?.length > 0
    );

    if (portfolio?.funding_sources?.length || portfolio?.projects?.length || hasLoanDraws) {
      throw new APIError(
        'Cannot delete portfolio with active funding sources, projects, or loan draws. Reassign them first.',
        400,
        'HAS_DEPENDENCIES'
      );
    }

    // Soft delete
    const { error } = await supabaseAdmin
      .from('portfolios')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw new APIError(error.message, 500, 'DELETE_ERROR');

    return successResponse({ deleted: true }, 200);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Internal server error', 500, 'UNKNOWN');
  }
});
