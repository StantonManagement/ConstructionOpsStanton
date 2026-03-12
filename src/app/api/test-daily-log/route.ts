import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import twilio from 'twilio';

// Test endpoint to send daily log SMS immediately, bypassing time checks
export async function GET(request: NextRequest) {
  try {
    const currentDate = new Date().toISOString().split('T')[0];

    // Get the most recent pending daily log request
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
      .order('created_at', { ascending: false })
      .limit(1);

    if (requestsError) {
      console.error('Error fetching pending requests:', requestsError);
      return NextResponse.json({ error: 'Failed to fetch pending requests' }, { status: 500 });
    }

    if (!pendingRequests || pendingRequests.length === 0) {
      return NextResponse.json({ message: 'No pending daily log requests found for today' });
    }

    const request = pendingRequests[0];
    const projectName = (request.project as any)?.name || 'Unknown Project';
    const projectClient = (request.project as any)?.client_name || 'Unknown Client';

    if (!request.pm_phone_number) {
      return NextResponse.json({
        error: 'No PM phone number found',
        request
      }, { status: 400 });
    }

    // Send the SMS using Twilio directly
    const message = `Hi! This is your daily log reminder for project: ${projectName} (${projectClient}). Please reply with your notes about today's progress, any issues, or updates.`;

    console.log(`[TEST] Sending SMS to ${request.pm_phone_number} for project ${projectName}`);

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    try {
      const twilioMessage = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: request.pm_phone_number
      });

      const smsResult = {
        success: true,
        sid: twilioMessage.sid
      };

      if (smsResult.success) {
        // Update request status to sent
        await supabase
          .from('daily_log_requests')
          .update({
            request_status: 'sent',
            last_request_sent_at: new Date().toISOString()
          })
          .eq('id', request.id);

        return NextResponse.json({
          success: true,
          message: 'SMS sent successfully',
          project: projectName,
          phone: request.pm_phone_number,
          sms_sid: smsResult.sid
        });
      }
    } catch (twilioError: any) {
      console.error('[TEST] Twilio error:', twilioError);
      return NextResponse.json({
        success: false,
        error: twilioError.message || 'Failed to send SMS via Twilio',
        project: projectName,
        phone: request.pm_phone_number
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[TEST] Error in test daily log endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
