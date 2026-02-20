import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseClient';

export const runtime = 'nodejs';

// POST /api/daily-logs/[id]/photos - Upload photo
export async function POST(
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

    // Verify the log exists and get its details
    const { data: log, error: logError } = await supabase
      .from('daily_logs')
      .select('id, project_id, log_date, created_by')
      .eq('id', logId)
      .is('deleted_at', null)
      .single();

    if (logError || !log) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 });
    }

    if (log.created_by !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const caption = formData.get('caption') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log('[Daily Log Photos API] Uploading photo for log:', logId);

    // Generate file path: {project_id}/{log_date}/{timestamp}.jpg
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${timestamp}.${fileExt}`;
    const filePath = `${log.project_id}/${log.log_date}/${fileName}`;

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('daily-log-photos')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('[Daily Log Photos API] Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('daily-log-photos')
      .getPublicUrl(filePath);

    // Save photo record to database
    const { data: photoData, error: dbError } = await supabase
      .from('daily_log_photos')
      .insert({
        daily_log_id: logId,
        photo_url: publicUrl,
        supabase_storage_path: filePath,
        caption: caption || null,
        sort_order: 0, // TODO: Get max sort_order and increment
        taken_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Daily Log Photos API] Database error:', dbError);
      // Try to clean up uploaded file
      await supabase.storage.from('daily-log-photos').remove([filePath]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    console.log('[Daily Log Photos API] Photo uploaded:', photoData.id);

    return NextResponse.json({ success: true, data: photoData }, { status: 201 });
  } catch (error) {
    console.error('[Daily Log Photos API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
