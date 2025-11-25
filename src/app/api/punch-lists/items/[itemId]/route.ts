import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

// GET /api/punch-lists/items/[itemId] - Fetch single punch list item with photos
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { itemId } = await params;

    const { data, error } = await supabaseAdmin
      .from('punch_list_items')
      .select(`
        *,
        project:projects(id, name),
        contractor:contractors!punch_list_items_contractor_id_fkey(id, name, trade, phone, email),
        photos:punch_list_photos(*)
      `)
      .eq('id', itemId)
      .single();

    if (error) {
      console.error('[Punch List Item GET] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Punch list item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Punch List Item GET] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/punch-lists/items/[itemId] - Update punch list item
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { itemId } = await params;
    const body = await req.json();
    const { 
      status, 
      contractorNotes, 
      gcNotes, 
      priority, 
      dueDate, 
      locationArea,
      verifiedBy,
      description 
    } = body;

    // Build update object
    const updates: any = {};
    
    if (status !== undefined) {
      updates.status = status;
      
      // Set timestamps based on status changes
      if (status === 'in_progress' && !updates.started_at) {
        updates.started_at = new Date().toISOString();
      } else if (status === 'complete' && !updates.completed_at) {
        updates.completed_at = new Date().toISOString();
      } else if (status === 'verified') {
        updates.verified_at = new Date().toISOString();
        if (verifiedBy) {
          updates.verified_by = verifiedBy;
        }
      }
    }
    
    if (contractorNotes !== undefined) updates.contractor_notes = contractorNotes;
    if (gcNotes !== undefined) updates.gc_notes = gcNotes;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.due_date = dueDate;
    if (locationArea !== undefined) updates.location_area = locationArea;
    if (description !== undefined) updates.description = description;

    const { data, error } = await supabaseAdmin
      .from('punch_list_items')
      .update(updates)
      .eq('id', itemId)
      .select(`
        *,
        contractor:contractors!punch_list_items_contractor_id_fkey(id, name, trade, phone),
        photos:punch_list_photos(*)
      `)
      .single();

    if (error) {
      console.error('[Punch List Item PUT] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Punch List Item PUT] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/punch-lists/items/[itemId] - Delete punch list item
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { itemId } = await params;

    // Delete associated photos first (CASCADE should handle this, but being explicit)
    await supabaseAdmin
      .from('punch_list_photos')
      .delete()
      .eq('punch_list_item_id', itemId);

    // Delete the punch list item
    const { error } = await supabaseAdmin
      .from('punch_list_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('[Punch List Item DELETE] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Punch list item deleted' });
  } catch (error) {
    console.error('[Punch List Item DELETE] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

