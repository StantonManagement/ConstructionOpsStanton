import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { sendSMS } from '@/lib/sms';

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from a legitimate cron service (you should add proper authentication)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current time in EST
    const now = new Date();
    const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const currentTime = estTime.toTimeString().slice(0, 8); // HH:MM:SS format

    console.log(`Checking PM notes for time: ${currentTime}`);

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
      console.log('No PM notes to send at this time');
      return NextResponse.json({ message: 'No PM notes to send at this time' });
    }

    console.log(`Found ${notes.length} PM notes to send`);

    const results = [];

    for (const note of notes) {
      try {
        // Get PM manager phone number (you'll need to implement this based on your user structure)
        // For now, we'll use a placeholder - you should fetch the actual PM phone number
        const pmPhoneNumber = '+1234567890'; // Replace with actual PM phone number logic

        if (pmPhoneNumber) {
          const message = `PM Note for ${note.project.name}:\n\n${note.note}\n\nSent at ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}`;

          console.log(`Sending SMS to ${pmPhoneNumber} for note ${note.id}`);

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

            console.log(`Successfully sent SMS for note ${note.id}`);
          } else {
            results.push({
              id: note.id,
              status: 'failed',
              message: smsResult.error || 'Failed to send SMS'
            });

            console.error(`Failed to send SMS for note ${note.id}:`, smsResult.error);
          }
        } else {
          results.push({
            id: note.id,
            status: 'failed',
            message: 'No PM phone number found'
          });

          console.error(`No PM phone number found for note ${note.id}`);
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

    const successCount = results.filter(r => r.status === 'sent').length;
    const failureCount = results.filter(r => r.status === 'failed').length;

    console.log(`PM notes cron job completed: ${successCount} sent, ${failureCount} failed`);

    return NextResponse.json({
      message: `Processed ${notes.length} PM notes`,
      summary: {
        total: notes.length,
        sent: successCount,
        failed: failureCount
      },
      results
    });

  } catch (error) {
    console.error('Error in PM notes cron job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 