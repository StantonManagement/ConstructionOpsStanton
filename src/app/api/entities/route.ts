import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { 
  withAuth, 
  successResponse, 
  errorResponse, 
  APIError 
} from '@/lib/apiHelpers';

/**
 * Owner Entities API
 * Manages LLC/entity records for property ownership tracking
 */

// GET - Fetch all owner entities
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the token and get user info
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active_only') === 'true';
    const includeStats = searchParams.get('include_stats') === 'true';

    // Build query
    let query = supabaseAdmin
      .from('owner_entities')
      .select('*')
      .order('name', { ascending: true });

    // Apply filters
    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: entities, error } = await query;

    if (error) {
      console.error('[Entities API] Error fetching entities:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If stats requested, fetch property counts and budget totals
    if (includeStats && entities) {
      const entitiesWithStats = await Promise.all(
        entities.map(async (entity) => {
          // Count properties
          const { count: propertyCount, error: countError } = await supabaseAdmin!
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .eq('owner_entity_id', entity.id);

          // Sum budgets (active projects only)
          const { data: budgetData, error: budgetError } = await supabaseAdmin!
            .from('projects')
            .select('budget, spent')
            .eq('owner_entity_id', entity.id)
            .eq('status', 'active');

          let totalBudget = 0;
          let totalSpent = 0;

          if (!budgetError && budgetData) {
            totalBudget = budgetData.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
            totalSpent = budgetData.reduce((sum, p) => sum + (Number(p.spent) || 0), 0);
          }

          return {
            ...entity,
            stats: {
              property_count: propertyCount || 0,
              total_budget: totalBudget,
              total_spent: totalSpent,
              total_remaining: totalBudget - totalSpent
            }
          };
        })
      );

      return NextResponse.json({ entities: entitiesWithStats }, { status: 200 });
    }

    return NextResponse.json({ entities }, { status: 200 });

  } catch (error: any) {
    console.error('[Entities API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new owner entity
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify the token and get user info
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_role')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole || userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      entity_type = 'LLC',
      tax_id,
      contact_name,
      contact_email,
      contact_phone,
      accounting_ref,
      notes,
      is_active = true
    } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Entity name is required' }, { status: 400 });
    }

    // Insert new entity
    const { data: newEntity, error: insertError } = await supabaseAdmin
      .from('owner_entities')
      .insert([{
        name: name.trim(),
        entity_type,
        tax_id: tax_id?.trim() || null,
        contact_name: contact_name?.trim() || null,
        contact_email: contact_email?.trim() || null,
        contact_phone: contact_phone?.trim() || null,
        accounting_ref: accounting_ref?.trim() || null,
        notes: notes?.trim() || null,
        is_active
      }])
      .select()
      .single();

    if (insertError) {
      console.error('[Entities API] Error creating entity:', insertError);
      
      // Check for unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'An entity with this name already exists' }, { status: 409 });
      }
      
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log('[Entities API] Created entity:', newEntity.id);
    return NextResponse.json({ entity: newEntity }, { status: 201 });

  } catch (error: any) {
    console.error('[Entities API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update existing entity (for bulk updates or general update endpoint)
export async function PUT(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify the token and get user info
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_role')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole || userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Entity ID is required' }, { status: 400 });
    }

    // Update entity
    const { data: updatedEntity, error: updateError } = await supabaseAdmin
      .from('owner_entities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Entities API] Error updating entity:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedEntity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    }

    console.log('[Entities API] Updated entity:', id);
    return NextResponse.json({ entity: updatedEntity }, { status: 200 });

  } catch (error: any) {
    console.error('[Entities API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete entity (soft delete by setting is_active = false)
export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    // Verify the token and get user info
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_role')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole || userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Parse request body
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Entity ID is required' }, { status: 400 });
    }

    // Check if entity has associated properties
    const { count: propertyCount } = await supabaseAdmin
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('owner_entity_id', parseInt(id));

    if (propertyCount && propertyCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete entity with ${propertyCount} associated properties. Please reassign properties first.` 
      }, { status: 409 });
    }

    // Soft delete by setting is_active = false
    const { data: deletedEntity, error: deleteError } = await supabaseAdmin
      .from('owner_entities')
      .update({ is_active: false })
      .eq('id', parseInt(id))
      .select()
      .single();

    if (deleteError) {
      console.error('[Entities API] Error deleting entity:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (!deletedEntity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    }

    console.log('[Entities API] Deleted (soft) entity:', id);
    return NextResponse.json({ message: 'Entity deleted successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('[Entities API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

