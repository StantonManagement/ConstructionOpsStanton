import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

// GET /api/punch-lists/[projectId] - Fetch all punch list items for a project
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    
    if (!supabaseAdmin) {
      console.error('[Punch Lists GET] FATAL: supabaseAdmin is not initialized');
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { projectId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const contractorId = searchParams.get('contractorId');
    const status = searchParams.get('status');

    // First, try a simple query to see if the table exists
    const testQuery = await supabaseAdmin
      .from('punch_list_items')
      .select('id')
      .limit(1);
    
    if (testQuery.error) {
      console.error('[Punch Lists GET] TABLE TEST FAILED:', {
        message: testQuery.error.message,
        details: testQuery.error.details,
        hint: testQuery.error.hint,
        code: testQuery.error.code,
        fullError: JSON.stringify(testQuery.error, null, 2)
      });
      return NextResponse.json({ 
        error: `Database table error: ${testQuery.error.message}`,
        details: testQuery.error.details,
        hint: testQuery.error.hint
      }, { status: 500 });
    }
    
    // Build query - use explicit FK name to avoid ambiguity with assigned_to field
    let query = supabaseAdmin
      .from('punch_list_items')
      .select(`
        *,
        contractor:contractors!punch_list_items_contractor_id_fkey(id, name, trade, phone),
        photos:punch_list_photos(*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (contractorId) {
      query = query.eq('contractor_id', contractorId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Punch Lists GET] QUERY ERROR:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: JSON.stringify(error, null, 2)
      });
      return NextResponse.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Punch Lists GET] EXCEPTION:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fullError: JSON.stringify(error, null, 2)
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST /api/punch-lists/[projectId] - Create punch list items (supports bulk)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { projectId } = await params;
    const body = await req.json();
    const { items, userId } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items array is required' }, { status: 400 });
    }

    // Insert items one at a time to generate item_numbers
    const insertedItems = [];
    
    for (const item of items) {
      // Generate item number using database function
      const { data: itemNumberData, error: itemNumberError } = await supabaseAdmin
        .rpc('generate_punch_item_number', { p_project_id: parseInt(projectId) });
      
      if (itemNumberError) {
        console.error('[Punch Lists POST] Error generating item number:', itemNumberError);
        return NextResponse.json({ 
          error: `Failed to generate item number: ${itemNumberError.message}` 
        }, { status: 500 });
      }

      const itemNumber = itemNumberData;

      // Prepare item for insertion (matching actual database schema)
      const itemToInsert = {
        project_id: parseInt(projectId),
        item_number: itemNumber,
        contractor_id: item.contractorId || null,
        assigned_to: item.contractorId || null, // Same as contractor_id for now
        description: item.description,
        severity: item.priority || 'medium', // Database uses 'severity' not 'priority'
        priority: item.priority || 'medium', // Keep for backward compat
        due_date: item.dueDate || null,
        location: item.locationArea || null,
        location_area: item.locationArea || null,
        status: item.status || 'assigned', // Must be: assigned, in_progress, complete, or verified
        created_by: userId || null,
        assigned_by: userId || null,
        assigned_at: new Date().toISOString(),
        notes: item.gcNotes || null,
        gc_notes: item.gcNotes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: insertedItem, error: insertError } = await supabaseAdmin
        .from('punch_list_items')
        .insert(itemToInsert)
        .select(`
          *,
          contractor:contractors!punch_list_items_contractor_id_fkey(id, name, trade, phone)
        `)
        .single();

      if (insertError) {
        console.error('[Punch Lists POST] Error inserting item:', insertError);
        return NextResponse.json({ 
          error: `Failed to insert item: ${insertError.message}`,
          details: insertError.details
        }, { status: 500 });
      }

      insertedItems.push(insertedItem);
    }

    const data = insertedItems;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('[Punch Lists POST] EXCEPTION:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
