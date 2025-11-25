import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { verify } from 'jsonwebtoken';

// Helper to verify token
function verifyContractorToken(token: string): any {
  try {
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = verify(token, jwtSecret);
    return decoded;
  } catch (error) {
    return null;
  }
}

// GET /api/punch-lists/contractor/[contractorId] - Public access with token
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contractorId: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { contractorId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const token = searchParams.get('token');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');

    // Verify token
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 401 });
    }

    const decoded = verifyContractorToken(token);
    if (!decoded || decoded.contractorId !== parseInt(contractorId)) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Verify token exists in database and hasn't expired
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('contractor_portal_tokens')
      .select('*')
      .eq('token', token)
      .eq('contractor_id', contractorId)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }

    // Build query
    let query = supabaseAdmin
      .from('punch_list_items')
      .select(`
        *,
        project:projects(id, name, client_name),
        photos:punch_list_photos(*)
      `)
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Contractor Punch Lists GET] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get contractor info
    const { data: contractor } = await supabaseAdmin
      .from('contractors')
      .select('id, name, trade')
      .eq('id', contractorId)
      .single();

    return NextResponse.json({ 
      success: true, 
      data: {
        items: data,
        contractor,
      }
    });
  } catch (error) {
    console.error('[Contractor Punch Lists GET] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/punch-lists/contractor/[contractorId] - Contractor can update their items
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ contractorId: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { contractorId } = await params;
    const body = await req.json();
    const { itemId, status, contractorNotes, token } = body;

    // Verify token
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 401 });
    }

    const decoded = verifyContractorToken(token);
    if (!decoded || decoded.contractorId !== parseInt(contractorId)) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    // Verify the item belongs to this contractor
    const { data: item, error: itemError } = await supabaseAdmin
      .from('punch_list_items')
      .select('id, contractor_id')
      .eq('id', itemId)
      .single();

    if (itemError || !item || item.contractor_id !== parseInt(contractorId)) {
      return NextResponse.json({ error: 'Punch list item not found' }, { status: 404 });
    }

    // Build update object (contractors can only update certain fields)
    const updates: any = {};
    
    // Contractors can only set status to in_progress or complete
    if (status !== undefined) {
      if (!['in_progress', 'complete'].includes(status)) {
        return NextResponse.json({ 
          error: 'Contractors can only set status to in_progress or complete' 
        }, { status: 400 });
      }
      updates.status = status;
      
      if (status === 'in_progress') {
        updates.started_at = new Date().toISOString();
      } else if (status === 'complete') {
        updates.completed_at = new Date().toISOString();
      }
    }
    
    if (contractorNotes !== undefined) {
      updates.contractor_notes = contractorNotes;
    }

    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from('punch_list_items')
      .update(updates)
      .eq('id', itemId)
      .select(`
        *,
        project:projects!punch_list_items_project_id_fkey(id, name),
        photos:punch_list_photos(*)
      `)
      .single();

    if (updateError) {
      console.error('[Contractor Punch List PUT] Error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updatedItem });
  } catch (error) {
    console.error('[Contractor Punch List PUT] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

