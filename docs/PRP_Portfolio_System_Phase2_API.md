# PRP: Portfolio System — Phase 2: API Routes

## Objective
Create CRUD API routes for portfolios and funding sources following existing patterns.

---

## Pre-Flight

```bash
# MCP: Verify apiHelpers exists
ls -la src/lib/apiHelpers.ts

# MCP: Check existing API route structure
ls -la src/app/api/
```

Reference: `src/app/api/projects/route.ts` for pattern

---

## 2.1 Portfolios API

### File: `src/app/api/portfolios/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';
import { supabaseAdmin } from '@/lib/supabaseClient';

// GET /api/portfolios - List all portfolios
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Database not available', 500, 'DB_ERROR');
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') !== 'false';

    let query = supabaseAdmin
      .from('portfolios')
      .select(`
        *,
        funding_sources (
          id,
          name,
          type,
          commitment_amount,
          drawn_amount
        ),
        projects (
          id,
          name
        )
      `)
      .order('name');

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw new APIError(error.message, 500, 'QUERY_ERROR');

    // Add computed totals per portfolio
    const enriched = data?.map(portfolio => ({
      ...portfolio,
      totals: {
        funding_sources: portfolio.funding_sources?.length || 0,
        projects: portfolio.projects?.length || 0,
        commitment: portfolio.funding_sources?.reduce((sum: number, fs: any) => sum + (fs.commitment_amount || 0), 0) || 0,
        drawn: portfolio.funding_sources?.reduce((sum: number, fs: any) => sum + (fs.drawn_amount || 0), 0) || 0,
      }
    }));

    return successResponse({ portfolios: enriched }, 200);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Internal server error', 500, 'UNKNOWN');
  }
});

// POST /api/portfolios - Create portfolio
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Database not available', 500, 'DB_ERROR');
    }

    const body = await request.json();
    const { name, code, description, owner_entity_id } = body;

    if (!name) {
      throw new APIError('Portfolio name is required', 400, 'VALIDATION_ERROR');
    }

    const { data, error } = await supabaseAdmin
      .from('portfolios')
      .insert({
        name,
        code: code || name.substring(0, 10).toUpperCase().replace(/\s/g, '-'),
        description,
        owner_entity_id,
        is_active: true
      })
      .select()
      .single();

    if (error) throw new APIError(error.message, 500, 'INSERT_ERROR');

    return successResponse({ portfolio: data }, 201);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Internal server error', 500, 'UNKNOWN');
  }
});
```

### File: `src/app/api/portfolios/[id]/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';
import { supabaseAdmin } from '@/lib/supabaseClient';

// GET /api/portfolios/[id] - Get single portfolio with details
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
  { params }: { params: { id: string } },
  user: any
) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Database not available', 500, 'DB_ERROR');
    }

    const { id } = params;
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
  { params }: { params: { id: string } },
  user: any
) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Database not available', 500, 'DB_ERROR');
    }

    const { id } = params;

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
```

---

## 2.2 Funding Sources API

### File: `src/app/api/funding-sources/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';
import { supabaseAdmin } from '@/lib/supabaseClient';

// GET /api/funding-sources - List funding sources
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Database not available', 500, 'DB_ERROR');
    }

    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolio_id');
    const type = searchParams.get('type');
    const activeOnly = searchParams.get('active') !== 'false';

    let query = supabaseAdmin
      .from('funding_sources')
      .select(`
        *,
        portfolio:portfolios (
          id,
          name,
          code
        )
      `)
      .order('name');

    if (portfolioId) {
      query = query.eq('portfolio_id', portfolioId);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw new APIError(error.message, 500, 'QUERY_ERROR');

    // Add computed remaining
    const enriched = data?.map(fs => ({
      ...fs,
      remaining: (fs.commitment_amount || 0) - (fs.drawn_amount || 0)
    }));

    return successResponse({ funding_sources: enriched }, 200);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Internal server error', 500, 'UNKNOWN');
  }
});

// POST /api/funding-sources - Create funding source
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    if (!supabaseAdmin) {
      throw new APIError('Database not available', 500, 'DB_ERROR');
    }

    const body = await request.json();
    const {
      portfolio_id,
      name,
      type,
      lender_name,
      commitment_amount,
      drawn_amount,
      interest_rate,
      maturity_date,
      loan_number,
      notes
    } = body;

    if (!portfolio_id) {
      throw new APIError('Portfolio ID is required', 400, 'VALIDATION_ERROR');
    }
    if (!name) {
      throw new APIError('Name is required', 400, 'VALIDATION_ERROR');
    }
    if (!type || !['loan', 'grant', 'equity', 'other'].includes(type)) {
      throw new APIError('Valid type is required (loan, grant, equity, other)', 400, 'VALIDATION_ERROR');
    }

    const { data, error } = await supabaseAdmin
      .from('funding_sources')
      .insert({
        portfolio_id,
        name,
        type,
        lender_name,
        commitment_amount: commitment_amount || 0,
        drawn_amount: drawn_amount || 0,
        interest_rate,
        maturity_date,
        loan_number,
        notes,
        is_active: true
      })
      .select(`
        *,
        portfolio:portfolios (id, name, code)
      `)
      .single();

    if (error) throw new APIError(error.message, 500, 'INSERT_ERROR');

    return successResponse({ funding_source: data }, 201);
  } catch (error) {
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Internal server error', 500, 'UNKNOWN');
  }
});
```

### File: `src/app/api/funding-sources/[id]/route.ts`

```typescript
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
```

---

## Verification Checklist

```bash
# MCP: After creating files, verify structure
ls -la src/app/api/portfolios/
ls -la src/app/api/funding-sources/
```

Test endpoints manually:
- [ ] GET /api/portfolios returns list
- [ ] POST /api/portfolios creates new
- [ ] GET /api/portfolios/[id] returns single with funding_sources and projects
- [ ] PUT /api/portfolios/[id] updates
- [ ] DELETE /api/portfolios/[id] soft deletes (or errors if has dependencies)
- [ ] GET /api/funding-sources returns list
- [ ] GET /api/funding-sources?portfolio_id=X filters correctly
- [ ] POST /api/funding-sources creates new
- [ ] PUT /api/funding-sources/[id] updates
- [ ] DELETE /api/funding-sources/[id] handles hard/soft delete

---

## Stop Gate

Do NOT proceed to Phase 3 until:
1. All API files created
2. All endpoints return expected responses
3. No TypeScript errors in API files
