import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseClient';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for AI processing

// POST /api/daily-logs/[id]/organize - Trigger AI organization
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

    console.log('[Daily Log Organize API] Organizing log:', logId);

    // Fetch the log with all its data
    const { data: log, error: logError } = await supabase
      .from('daily_logs')
      .select(`
        *,
        photos:daily_log_photos(*),
        audio:daily_log_audio(*)
      `)
      .eq('id', logId)
      .is('deleted_at', null)
      .single();

    if (logError || !log) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 });
    }

    if (log.created_by !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get project name
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', log.project_id)
      .single();

    const projectName = project?.name || 'Unknown Project';

    // Build the prompt for Claude
    const weatherInfo = log.weather_temp_f
      ? `Weather: ${log.weather_temp_f}°F, ${log.weather_conditions}, wind ${log.weather_wind_mph}mph.`
      : 'Weather: Not recorded.';

    const typedNotes = log.notes || 'No typed notes.';

    const transcriptions = log.audio
      .filter((a: any) => a.transcription)
      .map((a: any, idx: number) => `Audio Note ${idx + 1}: ${a.transcription}`)
      .join('\n\n');

    const audioNotes = transcriptions || 'No audio notes.';

    const photoCount = log.photos?.length || 0;

    const prompt = `You are organizing a construction daily log for ${projectName} on ${log.log_date}.
${weatherInfo}

The field PM recorded the following notes and audio throughout the day.
Organize this into a clean daily report with these sections:
- Summary (2-3 sentences)
- Work Completed
- Issues & Blockers
- Contractor Activity
- Safety Observations
- Follow-Up Items

Raw inputs:

Typed Notes:
${typedNotes}

Audio Notes:
${audioNotes}

Photos: ${photoCount} photos attached

Please provide a well-organized, professional daily log report.`;

    console.log('[Daily Log Organize API] Calling Claude AI...');

    // Call Claude API
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Daily Log Organize API] Claude API error:', errorText);
      return NextResponse.json({ error: 'AI service error' }, { status: 500 });
    }

    const aiResponse = await response.json();
    const aiSummary = aiResponse.content[0].text;

    console.log('[Daily Log Organize API] AI response received, updating log...');

    // Parse the AI response into structured JSON (basic parsing for now)
    const aiSummaryJson = {
      summary: aiSummary,
      sections: {
        summary: '',
        work_completed: '',
        issues_blockers: '',
        contractor_activity: '',
        safety_observations: '',
        follow_up_items: ''
      },
      generated_at: new Date().toISOString()
    };

    // Update the log with AI summary and mark as submitted
    const { data: updatedLog, error: updateError } = await supabase
      .from('daily_logs')
      .update({
        ai_summary: aiSummary,
        ai_summary_json: aiSummaryJson,
        ai_processed_at: new Date().toISOString(),
        status: 'submitted',
        updated_at: new Date().toISOString()
      })
      .eq('id', logId)
      .select()
      .single();

    if (updateError) {
      console.error('[Daily Log Organize API] Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log('[Daily Log Organize API] Log organized successfully:', logId);

    return NextResponse.json({ success: true, data: updatedLog }, { status: 200 });
  } catch (error) {
    console.error('[Daily Log Organize API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
