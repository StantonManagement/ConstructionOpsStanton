import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { sendSMS } from '@/lib/sms';

export async function GET(request: NextRequest) {
  try {
    // TODO: Add proper authentication for production
    // For now, allow the cron job to run without auth for development
    // const authHeader = request.headers.get('authorization');
    // if (!authHeader || !authHeader.startsWith('Bearer ')) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Get current time in EST
    const now = new Date();
    const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const currentDate = estTime.toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentTime = estTime.toTimeString().slice(0, 5); // HH:MM format (without seconds)

    console.log(`Checking daily log requests for date: ${currentDate}, time: ${currentTime}`);

    // Get all daily log requests that should be sent at the current time
    const { data: pendingRequests, error: requestsError } = await supabase
      .from('daily_log_requests')
      .select(`
        id,
        project_id,
        pm_phone_number,
        request_time,
        project:projects(id, name, client_name)
      `)
      .eq('request_date', currentDate)
      .eq('request_status', 'pending')
      .not('request_time', 'is', null);

    if (requestsError) {
      console.error('Error fetching pending requests:', requestsError);
      return NextResponse.json({ error: 'Failed to fetch pending requests' }, { status: 500 });
    }

    // Filter requests that should be sent at the current time
    const requestsToSend = (pendingRequests || []).filter((request: any) => {
      const requestTime = request.request_time?.slice(0, 5); // HH:MM format
      return requestTime === currentTime;
    });

    if (requestsToSend.length === 0) {
      console.log(`No requests scheduled for ${currentTime} EST`);
      return NextResponse.json({ message: `No requests scheduled for ${currentTime} EST` });
    }

    console.log(`Sending ${requestsToSend.length} daily log requests at ${currentTime} EST`);

    const results = [];

    for (const request of requestsToSend) {
      const projectName = (request.project as any)?.name || 'Unknown Project';
      const projectClient = (request.project as any)?.client_name || 'Unknown Client';
      
      try {
        if (!request.pm_phone_number) {
          console.log(`No PM phone number found for project ${projectName}`);
          results.push({
            project_id: request.project_id,
            project_name: projectName,
            status: 'skipped',
            message: 'No PM phone number found'
          });
          continue;
        }

        // Send the SMS
        const message = `Hi! This is your daily log reminder for project: ${projectName} (${projectClient}). Please reply with your notes about today's progress, any issues, or updates.`;

        console.log(`Sending SMS to ${request.pm_phone_number} for project ${projectName}`);

        const smsResult = await sendSMS(request.pm_phone_number, message);

        if (smsResult.success) {
          // Update request status to sent
          await supabase
            .from('daily_log_requests')
            .update({
              request_status: 'sent',
              last_request_sent_at: new Date().toISOString()
            })
            .eq('id', request.id);

          results.push({
            project_id: request.project_id,
            project_name: projectName,
            status: 'sent',
            message: 'SMS sent successfully'
          });

          console.log(`Successfully sent SMS for project ${projectName}`);
        } else {
          // Update request status to failed
          await supabase
            .from('daily_log_requests')
            .update({
              request_status: 'failed',
              last_request_sent_at: new Date().toISOString()
            })
            .eq('id', request.id);

          results.push({
            project_id: request.project_id,
            project_name: projectName,
            status: 'failed',
            message: smsResult.error || 'Failed to send SMS'
          });

          console.error(`Failed to send SMS for project ${projectName}:`, smsResult.error);
        }
      } catch (error) {
        console.error(`Error processing request for project ${projectName}:`, error);
        results.push({
          project_id: request.project_id,
          project_name: projectName,
          status: 'failed',
          message: 'Internal error'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'sent').length;
    const failureCount = results.filter(r => r.status === 'failed').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    console.log(`Daily log requests cron job completed: ${successCount} sent, ${failureCount} failed, ${skippedCount} skipped`);

    return NextResponse.json({
      message: `Processed ${requestsToSend.length} requests for daily log requests`,
      summary: {
        total: requestsToSend.length,
        sent: successCount,
        failed: failureCount,
        skipped: skippedCount
      },
      results
    });

  } catch (error) {
    console.error('Error in daily log requests cron job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 