import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

/**
 * Property Budgets API
 * Manages budget line items for properties/projects
 */

// GET - Fetch budgets (optionally filtered by project)
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const useSummary = searchParams.get('summary') === 'true';

    // Build query
    if (useSummary) {
      // Use the view with calculated fields
      let query = supabaseAdmin
        .from('property_budgets_summary')
        .select('*')
        .order('display_order', { ascending: true })
        .order('category_name', { ascending: true });

      if (projectId) {
        query = query.eq('project_id', parseInt(projectId));
      }

      const { data: budgets, error } = await query;

      if (error) {
        console.error('[Budgets API] Error fetching budget summary:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ budgets: budgets || [] }, { status: 200 });
    } else {
      // Regular table query (exclude inactive)
      let query = supabaseAdmin
        .from('property_budgets')
        .select('*')
        .eq('is_active', true)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('category_name', { ascending: true });

      if (projectId) {
        query = query.eq('project_id', parseInt(projectId));
      }

      const { data: budgets, error } = await query;

      if (error) {
        console.error('[Budgets API] Error fetching budgets:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ budgets: budgets || [] }, { status: 200 });
    }

  } catch (error: any) {
    console.error('[Budgets API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new budget line item(s) - supports single item or bulk array
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
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

    const body = await request.json();
    
    // Check if bulk create (array) or single item
    const isBulk = Array.isArray(body.items);
    
    if (isBulk) {
      // BULK CREATE MODE
      const { project_id, items } = body;
      
      if (!project_id) {
        return NextResponse.json({ error: 'Missing required field: project_id' }, { status: 400 });
      }
      
      if (!items || items.length === 0) {
        return NextResponse.json({ error: 'No items provided for bulk create' }, { status: 400 });
      }
      
      // Validate project exists
      const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .select('id')
        .eq('id', project_id)
        .single();

      if (projectError || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      
      // Validate and prepare all items
      const budgetItems = [];
      const errors = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        if (!item.category_name || !item.category_name.trim()) {
          errors.push(`Row ${i + 1}: Missing category name`);
          continue;
        }
        
        if (item.original_amount === undefined || item.original_amount === null || isNaN(parseFloat(item.original_amount))) {
          errors.push(`Row ${i + 1}: Invalid or missing original amount`);
          continue;
        }
        
        const originalAmount = parseFloat(item.original_amount);
        if (originalAmount < 0) {
          errors.push(`Row ${i + 1}: Original amount cannot be negative`);
          continue;
        }
        
        // Parse optional numeric fields with NaN fallback
        const revisedAmount = item.revised_amount !== undefined ? parseFloat(item.revised_amount) : NaN;
        const actualSpend = item.actual_spend !== undefined ? parseFloat(item.actual_spend) : NaN;
        const committedCosts = item.committed_costs !== undefined ? parseFloat(item.committed_costs) : NaN;
        
        budgetItems.push({
          project_id: parseInt(project_id),
          category_name: item.category_name.trim(),
          description: item.description?.trim() || null,
          original_amount: originalAmount,
          revised_amount: isNaN(revisedAmount) ? originalAmount : revisedAmount,
          actual_spend: isNaN(actualSpend) ? 0 : actualSpend,
          committed_costs: isNaN(committedCosts) ? 0 : committedCosts,
          display_order: parseInt(item.display_order) || i,
          notes: item.notes?.trim() || null,
          is_active: true
        });
      }
      
      if (budgetItems.length === 0) {
        return NextResponse.json({ 
          error: 'No valid items to create', 
          details: errors 
        }, { status: 400 });
      }
      
      // Check for existing items (including soft-deleted) and upsert
      const categoryNames = budgetItems.map(item => item.category_name);
      
      const { data: existingItems } = await supabaseAdmin
        .from('property_budgets')
        .select('id, category_name, is_active')
        .eq('project_id', parseInt(project_id))
        .in('category_name', categoryNames);
      
      const existingMap = new Map(
        (existingItems || []).map(item => [item.category_name.toLowerCase(), item])
      );
      
      const toInsert: typeof budgetItems = [];
      const toUpdate: { id: number; data: typeof budgetItems[0] }[] = [];
      
      for (const item of budgetItems) {
        const existing = existingMap.get(item.category_name.toLowerCase());
        if (existing) {
          // Update existing (reactivate if soft-deleted)
          toUpdate.push({ 
            id: existing.id, 
            data: { ...item, is_active: true } 
          });
        } else {
          toInsert.push(item);
        }
      }
      
      let insertedCount = 0;
      let updatedCount = 0;
      
      // Insert new items
      if (toInsert.length > 0) {
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from('property_budgets')
          .insert(toInsert)
          .select();
        
        if (insertError) {
          console.error('[Budgets API] Error inserting new budgets:', insertError);
          // Don't include validation `errors` here - they're unrelated to the insert failure
          return NextResponse.json({ 
            error: insertError.message,
            code: insertError.code 
          }, { status: 500 });
        }
        insertedCount = inserted?.length || 0;
      }
      
      // Update existing items (including reactivating soft-deleted)
      for (const { id, data } of toUpdate) {
        const { error: updateError } = await supabaseAdmin
          .from('property_budgets')
          .update({
            original_amount: data.original_amount,
            revised_amount: data.revised_amount,
            actual_spend: data.actual_spend,
            committed_costs: data.committed_costs,
            is_active: true
          })
          .eq('id', id);
        
        if (!updateError) updatedCount++;
      }

      console.log(`[Budgets API] Bulk operation: ${insertedCount} created, ${updatedCount} updated/reactivated`);
      return NextResponse.json({ 
        created: insertedCount,
        updated: updatedCount,
        skipped: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }, { status: 201 });
      
    } else {
      // SINGLE CREATE MODE (original behavior)
      const {
        project_id,
        category_name,
        description,
        original_amount,
        display_order = 0,
        notes
      } = body;

      // Validate required fields
      if (!project_id || !category_name || original_amount === undefined) {
        return NextResponse.json({ error: 'Missing required fields: project_id, category_name, original_amount' }, { status: 400 });
      }

      // Validate project exists
      const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .select('id')
        .eq('id', project_id)
        .single();

      if (projectError || !project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Insert budget line item
      // revised_amount starts as same as original_amount
      const { data: newBudget, error: insertError } = await supabaseAdmin
        .from('property_budgets')
        .insert([{
          project_id: parseInt(project_id),
          category_name: category_name.trim(),
          description: description?.trim() || null,
          original_amount: parseFloat(original_amount),
          revised_amount: parseFloat(original_amount), // Starts same as original
          actual_spend: 0,
          committed_costs: 0,
          display_order: parseInt(display_order) || 0,
          notes: notes?.trim() || null,
          is_active: true
        }])
        .select()
        .single();

      if (insertError) {
        console.error('[Budgets API] Error creating budget:', insertError);
        
        // Check for unique constraint violation
        if (insertError.code === '23505') {
          return NextResponse.json({ error: 'A budget category with this name already exists for this project' }, { status: 409 });
        }
        
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      console.log('[Budgets API] Created budget line item:', newBudget.id);
      return NextResponse.json({ budget: newBudget }, { status: 201 });
    }

  } catch (error: any) {
    console.error('[Budgets API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update budget line item
export async function PUT(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
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

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 });
    }

    // Remove fields that shouldn't be updated directly via this endpoint
    const { created_at, updated_at, project_id, ...safeUpdateData } = updateData;

    // Update budget
    const { data: updatedBudget, error: updateError } = await supabaseAdmin
      .from('property_budgets')
      .update(safeUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[Budgets API] Error updating budget:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedBudget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    console.log('[Budgets API] Updated budget:', id);
    return NextResponse.json({ budget: updatedBudget }, { status: 200 });

  } catch (error: any) {
    console.error('[Budgets API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete budget line item (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 });
    }

    // Soft delete by setting is_active = false
    const { data: deletedBudget, error: deleteError } = await supabaseAdmin
      .from('property_budgets')
      .update({ is_active: false })
      .eq('id', parseInt(id))
      .select()
      .single();

    if (deleteError) {
      console.error('[Budgets API] Error deleting budget:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (!deletedBudget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    console.log('[Budgets API] Deleted (soft) budget:', id);
    return NextResponse.json({ message: 'Budget deleted successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('[Budgets API] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

