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
    const currentDate = estTime.toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentTime = estTime.toTimeString().slice(0, 8); // HH:MM:SS format

    console.log(`Checking daily log requests for date: ${currentDate}, time: ${currentTime}`);

    // Check if it's 6 PM EST (18:00:00) - initial daily request
    const isInitialRequest = currentTime === '18:00:00';
    
    // Check if it's time for retries (every 30 minutes after 6 PM)
    const isRetryTime = currentTime.endsWith(':00:00') || currentTime.endsWith(':30:00');
    const isAfter6PM = parseInt(currentTime.split(':')[0]) >= 18;

    if (!isInitialRequest && (!isRetryTime || !isAfter6PM)) {
      console.log('Not time for daily log requests or retries');
      return NextResponse.json({ message: 'Not time for daily log requests' });
    }

    let query = supabase
      .from('daily_log_requests')
      .select(`
        *,
        project:projects(name, client_name)
      `)
      .eq('request_date', currentDate);

    if (isInitialRequest) {
      // For initial 6 PM request, get active projects that don't have a request today
      const { data: activeProjects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, client_name')
        .eq('status', 'active');

      if (projectsError) {
        console.error('Error fetching active projects:', projectsError);
        return NextResponse.json({ error: 'Failed to fetch active projects' }, { status: 500 });
      }

      // Create initial requests for active projects
      const initialRequests = [];
      for (const project of activeProjects) {
        // Get PM phone number (you'll need to implement this based on your user structure)
        // For now, we'll use a placeholder - you should fetch the actual PM phone number
        const pmPhoneNumber = '+1234567890'; // Replace with actual PM phone number logic

        if (pmPhoneNumber) {
          initialRequests.push({
            project_id: project.id,
            request_date: currentDate,
            pm_phone_number: pmPhoneNumber,
            request_status: 'pending',
            next_retry_at: new Date(now.getTime() + 30 * 60 * 1000).toISOString() // 30 minutes from now
          });
        }
      }

      if (initialRequests.length > 0) {
        const { data: createdRequests, error: createError } = await supabase
          .from('daily_log_requests')
          .insert(initialRequests)
          .select();

        if (createError) {
          console.error('Error creating initial requests:', createError);
          return NextResponse.json({ error: 'Failed to create initial requests' }, { status: 500 });
        }

        console.log(`Created ${createdRequests.length} initial daily log requests`);
      }

      // Now get the requests to process
      query = query.eq('request_status', 'pending');
    } else {
      // For retries, get requests that are pending and due for retry
      query = query
        .eq('request_status', 'pending')
        .lte('next_retry_at', now.toISOString())
        .lt('retry_count', 'max_retries');
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Error fetching daily log requests:', error);
      return NextResponse.json({ error: 'Failed to fetch daily log requests' }, { status: 500 });
    }

    if (!requests || requests.length === 0) {
      console.log('No daily log requests to process');
      return NextResponse.json({ message: 'No daily log requests to process' });
    }

    console.log(`Processing ${requests.length} daily log requests`);

    const results = [];

    for (const request of requests) {
      try {
        const message = isInitialRequest 
          ? `Hi! This is your daily log reminder for project: ${request.project.name} (${request.project.client_name}). Please reply with your notes about today's progress, any issues, or updates.`
          : `Reminder: We're still waiting for your daily log for project: ${request.project.name} (${request.project.client_name}). Please reply with your notes.`;

        console.log(`Sending SMS to ${request.pm_phone_number} for project ${request.project.name}`);

        // Send SMS
        const smsResult = await sendSMS(request.pm_phone_number, message);

        if (smsResult.success) {
          // Update request status
          const updateData: any = {
            request_status: 'sent',
            last_request_sent_at: new Date().toISOString(),
            retry_count: request.retry_count + 1
          };

          if (isInitialRequest) {
            updateData.first_request_sent_at = new Date().toISOString();
          }

          // Set next retry time (30 minutes from now)
          updateData.next_retry_at = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

          await supabase
            .from('daily_log_requests')
            .update(updateData)
            .eq('id', request.id);

          results.push({
            id: request.id,
            project_name: request.project.name,
            status: 'sent',
            message: 'SMS sent successfully'
          });

          console.log(`Successfully sent SMS for request ${request.id}`);
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
            id: request.id,
            project_name: request.project.name,
            status: 'failed',
            message: smsResult.error || 'Failed to send SMS'
          });

          console.error(`Failed to send SMS for request ${request.id}:`, smsResult.error);
        }
      } catch (error) {
        console.error(`Error processing request ${request.id}:`, error);
        results.push({
          id: request.id,
          project_name: request.project.name,
          status: 'failed',
          message: 'Internal error'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'sent').length;
    const failureCount = results.filter(r => r.status === 'failed').length;

    console.log(`Daily log requests cron job completed: ${successCount} sent, ${failureCount} failed`);

    return NextResponse.json({
      message: `Processed ${requests.length} daily log requests`,
      summary: {
        total: requests.length,
        sent: successCount,
        failed: failureCount
      },
      results
    });

  } catch (error) {
    console.error('Error in daily log requests cron job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 