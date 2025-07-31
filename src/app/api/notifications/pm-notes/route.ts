import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { sendSMS } from '@/lib/sms';

export async function GET(request: NextRequest) {
  try {
    // Get current time in EST
    const now = new Date();
    const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const currentTime = estTime.toTimeString().slice(0, 8); // HH:MM:SS format

    // Fetch active PM notes that should be sent now
    const { data: notes, error } = await supabase
      .from('pm_notes')
      .select(`
        *,
        project:projects(name, client_name)
      `)
      .eq('is_active', true)
      .eq('scheduled_time', currentTime)
      .is('last_sent_at', null); // Only send if not sent today

    if (error) {
      console.error('Error fetching PM notes:', error);
      return NextResponse.json({ error: 'Failed to fetch PM notes' }, { status: 500 });
    }

    if (!notes || notes.length === 0) {
      return NextResponse.json({ message: 'No PM notes to send at this time' });
    }

    const results = [];

    for (const note of notes) {
      try {
        // Get PM manager phone number (you'll need to implement this based on your user structure)
        // For now, we'll use a placeholder - you should fetch the actual PM phone number
        const pmPhoneNumber = '+1234567890'; // Replace with actual PM phone number logic

        if (pmPhoneNumber) {
          const message = `PM Note for ${note.project.name}:\n\n${note.note}\n\nSent at ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}`;

          // Send SMS
          const smsResult = await sendSMS(pmPhoneNumber, message);

          if (smsResult.success) {
            // Update last_sent_at
            await supabase
              .from('pm_notes')
              .update({ last_sent_at: new Date().toISOString() })
              .eq('id', note.id);

            results.push({
              id: note.id,
              status: 'sent',
              message: 'SMS sent successfully'
            });
          } else {
            results.push({
              id: note.id,
              status: 'failed',
              message: smsResult.error || 'Failed to send SMS'
            });
          }
        } else {
          results.push({
            id: note.id,
            status: 'failed',
            message: 'No PM phone number found'
          });
        }
      } catch (error) {
        console.error(`Error processing note ${note.id}:`, error);
        results.push({
          id: note.id,
          status: 'failed',
          message: 'Internal error'
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${notes.length} PM notes`,
      results
    });

  } catch (error) {
    console.error('Error in PM notes API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, note, scheduledTime = '18:00:00', isDaily = true } = body;

    if (!projectId || !note) {
      return NextResponse.json({ error: 'Project ID and note are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('pm_notes')
      .insert({
        project_id: projectId,
        note: note.trim(),
        scheduled_time: scheduledTime,
        is_daily: isDaily
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating PM note:', error);
      return NextResponse.json({ error: 'Failed to create PM note' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'PM note created successfully',
      note: data
    });

  } catch (error) {
    console.error('Error in PM notes POST API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 