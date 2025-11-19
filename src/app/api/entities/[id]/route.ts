import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

/**
 * Owner Entity Detail API
 * GET /api/entities/[id] - Fetch single entity with detailed stats
 * PUT /api/entities/[id] - Update entity
 * DELETE /api/entities/[id] - Delete entity
 */

// GET - Fetch single entity with detailed information
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { id } = await params;

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

    // Fetch entity
    const { data: entity, error: entityError } = await supabaseAdmin
      .from('owner_entities')
      .select('*')
      .eq('id', parseInt(id))
      .single();

    if (entityError || !entity) {
      console.error('[Entity Detail API] Error fetching entity:', entityError);
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    }

    // Fetch associated properties with their data
    const { data: properties, error: propertiesError } = await supabaseAdmin
      .from('projects')
      .select('id, name, status, budget, spent, portfolio_name, total_units, address, start_date, target_completion_date')
      .eq('owner_entity_id', parseInt(id))
      .order('name', { ascending: true });

    if (propertiesError) {
      console.error('[Entity Detail API] Error fetching properties:', propertiesError);
    }

    // Calculate aggregated stats
    const stats = {
      total_properties: properties?.length || 0,
      active_properties: properties?.filter(p => p.status === 'active').length || 0,
      completed_properties: properties?.filter(p => p.status === 'completed').length || 0,
      total_budget: properties?.reduce((sum, p) => sum + (Number(p.budget) || 0), 0) || 0,
      total_spent: properties?.reduce((sum, p) => sum + (Number(p.spent) || 0), 0) || 0,
    };

    stats['total_remaining'] = stats.total_budget - stats.total_spent;
    stats['percent_spent'] = stats.total_budget > 0 
      ? Math.round((stats.total_spent / stats.total_budget) * 100) 
      : 0;

    return NextResponse.json({ 
      entity, 
      properties: properties || [],
      stats 
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Entity Detail API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update entity
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { id } = await params;

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
    
    // Remove fields that shouldn't be updated via this endpoint
    const { id: _id, created_at, updated_at, ...updateData } = body;

    // Clean up string fields
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.tax_id) updateData.tax_id = updateData.tax_id.trim();
    if (updateData.contact_name) updateData.contact_name = updateData.contact_name.trim();
    if (updateData.contact_email) updateData.contact_email = updateData.contact_email.trim();
    if (updateData.contact_phone) updateData.contact_phone = updateData.contact_phone.trim();

    // Update entity
    const { data: updatedEntity, error: updateError } = await supabaseAdmin
      .from('owner_entities')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();

    if (updateError) {
      console.error('[Entity Detail API] Error updating entity:', updateError);
      
      // Check for unique constraint violation
      if (updateError.code === '23505') {
        return NextResponse.json({ error: 'An entity with this name already exists' }, { status: 409 });
      }
      
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedEntity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    }

    console.log('[Entity Detail API] Updated entity:', id);
    return NextResponse.json({ entity: updatedEntity }, { status: 200 });

  } catch (error: any) {
    console.error('[Entity Detail API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete entity
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { id } = await params;

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
      console.error('[Entity Detail API] Error deleting entity:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (!deletedEntity) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    }

    console.log('[Entity Detail API] Deleted (soft) entity:', id);
    return NextResponse.json({ message: 'Entity deleted successfully', entity: deletedEntity }, { status: 200 });

  } catch (error: any) {
    console.error('[Entity Detail API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

