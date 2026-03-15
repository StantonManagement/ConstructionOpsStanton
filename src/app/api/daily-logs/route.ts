import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseClient';

export const runtime = 'nodejs';

// GET /api/daily-logs?project_id=X (optional - if not provided, returns all logs)
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    console.log('[Daily Logs API] Fetching logs' + (projectId ? ` for project: ${projectId}` : ' (all projects)'));

    // Build query
    let query = supabase
      .from('daily_logs')
      .select(`
        *,
        photos:daily_log_photos(count),
        audio:daily_log_audio(count)
      `)
      .is('deleted_at', null);

    // Filter by project if provided
    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    // Execute query
    const { data, error } = await query.order('log_date', { ascending: false });

    if (error) {
      console.error('[Daily Logs API] Error fetching logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Daily Logs API] Found logs:', data?.length || 0);

    return NextResponse.json({ success: true, data: data || [] }, { status: 200 });
  } catch (error) {
    console.error('[Daily Logs API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/daily-logs - Create new daily log
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { project_id, log_date, notes } = body;

    if (!project_id) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
    }

    console.log('[Daily Logs API] Creating new log for project:', project_id);

    // TODO: Fetch weather data here (will add in next step)
    const weatherData = {
      weather_temp_f: null,
      weather_conditions: null,
      weather_wind_mph: null,
      weather_humidity: null,
      weather_raw_json: null
    };

    // Create the daily log
    const { data, error } = await supabase
      .from('daily_logs')
      .insert({
        project_id,
        created_by: user.id,
        log_date: log_date || new Date().toISOString().split('T')[0],
        notes: notes || '',
        status: 'draft',
        ...weatherData
      })
      .select()
      .single();

    if (error) {
      console.error('[Daily Logs API] Error creating log:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[Daily Logs API] Created log:', data.id);

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('[Daily Logs API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
