import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseClient';

export const runtime = 'nodejs';

// GET /api/daily-logs/[id] - Get single daily log with all details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { id } = await params;
    const logId = parseInt(id);

    if (isNaN(logId)) {
      return NextResponse.json({ error: 'Invalid log ID' }, { status: 400 });
    }

    console.log('[Daily Log API] Fetching log:', logId);

    // Fetch daily log with photos and audio
    const { data, error } = await supabase
      .from('daily_logs')
      .select(`
        *,
        photos:daily_log_photos(*),
        audio:daily_log_audio(*)
      `)
      .eq('id', logId)
      .is('deleted_at', null)
      .single();

    if (error) {
      console.error('[Daily Log API] Error fetching log:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 });
    }

    console.log('[Daily Log API] Found log:', logId);

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('[Daily Log API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/daily-logs/[id] - Update daily log
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    const logId = parseInt(id);

    if (isNaN(logId)) {
      return NextResponse.json({ error: 'Invalid log ID' }, { status: 400 });
    }

    const body = await request.json();
    const { notes, status } = body;

    console.log('[Daily Log API] Updating log:', logId);

    // Verify ownership
    const { data: existingLog, error: fetchError } = await supabase
      .from('daily_logs')
      .select('created_by')
      .eq('id', logId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingLog) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 });
    }

    if (existingLog.created_by !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update the log
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabase
      .from('daily_logs')
      .update(updateData)
      .eq('id', logId)
      .select()
      .single();

    if (error) {
      console.error('[Daily Log API] Error updating log:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Daily Log API] Updated log:', logId);

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('[Daily Log API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/daily-logs/[id] - Soft delete daily log
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    const logId = parseInt(id);

    if (isNaN(logId)) {
      return NextResponse.json({ error: 'Invalid log ID' }, { status: 400 });
    }

    console.log('[Daily Log API] Deleting log:', logId);

    // Verify ownership
    const { data: existingLog, error: fetchError } = await supabase
      .from('daily_logs')
      .select('created_by')
      .eq('id', logId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingLog) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 });
    }

    if (existingLog.created_by !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Soft delete
    const { error } = await supabase
      .from('daily_logs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', logId);

    if (error) {
      console.error('[Daily Log API] Error deleting log:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Daily Log API] Deleted log:', logId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Daily Log API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
