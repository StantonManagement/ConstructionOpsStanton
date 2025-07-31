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
    
    if (!isInitialRequest) {
      console.log('Not 6 PM EST - skipping daily log requests');
      return NextResponse.json({ message: 'Not time for daily log requests (only runs at 6 PM EST)' });
    }

    // Get active projects that don't have a request today
    const { data: activeProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, client_name')
      .eq('status', 'active');

    if (projectsError) {
      console.error('Error fetching active projects:', projectsError);
      return NextResponse.json({ error: 'Failed to fetch active projects' }, { status: 500 });
    }

    // Check which projects already have requests today
    const { data: existingRequests, error: existingError } = await supabase
      .from('daily_log_requests')
      .select('project_id')
      .eq('request_date', currentDate);

    if (existingError) {
      console.error('Error checking existing requests:', existingError);
      return NextResponse.json({ error: 'Failed to check existing requests' }, { status: 500 });
    }

    const existingProjectIds = new Set(existingRequests?.map(r => r.project_id) || []);
    const projectsNeedingRequests = activeProjects?.filter(p => !existingProjectIds.has(p.id)) || [];

    if (projectsNeedingRequests.length === 0) {
      console.log('No new projects need daily log requests today');
      return NextResponse.json({ message: 'No new projects need daily log requests today' });
    }

    console.log(`Creating daily log requests for ${projectsNeedingRequests.length} projects`);

    const results = [];

    for (const project of projectsNeedingRequests) {
      try {
        // Get PM phone number (you'll need to implement this based on your user structure)
        // For now, we'll use a placeholder - you should fetch the actual PM phone number
        const pmPhoneNumber = '+1234567890'; // Replace with actual PM phone number logic

        if (!pmPhoneNumber) {
          console.log(`No PM phone number found for project ${project.name}`);
          results.push({
            project_id: project.id,
            project_name: project.name,
            status: 'skipped',
            message: 'No PM phone number found'
          });
          continue;
        }

        // Create the request record
        const { data: createdRequest, error: createError } = await supabase
          .from('daily_log_requests')
          .insert({
            project_id: project.id,
            request_date: currentDate,
            pm_phone_number: pmPhoneNumber,
            request_status: 'pending',
            first_request_sent_at: new Date().toISOString(),
            retry_count: 0
          })
          .select()
          .single();

        if (createError) {
          console.error(`Error creating request for project ${project.name}:`, createError);
          results.push({
            project_id: project.id,
            project_name: project.name,
            status: 'failed',
            message: 'Failed to create request record'
          });
          continue;
        }

        // Send the SMS
        const message = `Hi! This is your daily log reminder for project: ${project.name} (${project.client_name}). Please reply with your notes about today's progress, any issues, or updates.`;

        console.log(`Sending SMS to ${pmPhoneNumber} for project ${project.name}`);

        const smsResult = await sendSMS(pmPhoneNumber, message);

        if (smsResult.success) {
          // Update request status to sent
          await supabase
            .from('daily_log_requests')
            .update({
              request_status: 'sent',
              last_request_sent_at: new Date().toISOString()
            })
            .eq('id', createdRequest.id);

          results.push({
            project_id: project.id,
            project_name: project.name,
            status: 'sent',
            message: 'SMS sent successfully'
          });

          console.log(`Successfully sent SMS for project ${project.name}`);
        } else {
          // Update request status to failed
          await supabase
            .from('daily_log_requests')
            .update({
              request_status: 'failed',
              last_request_sent_at: new Date().toISOString()
            })
            .eq('id', createdRequest.id);

          results.push({
            project_id: project.id,
            project_name: project.name,
            status: 'failed',
            message: smsResult.error || 'Failed to send SMS'
          });

          console.error(`Failed to send SMS for project ${project.name}:`, smsResult.error);
        }
      } catch (error) {
        console.error(`Error processing project ${project.name}:`, error);
        results.push({
          project_id: project.id,
          project_name: project.name,
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
      message: `Processed ${projectsNeedingRequests.length} projects for daily log requests`,
      summary: {
        total: projectsNeedingRequests.length,
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