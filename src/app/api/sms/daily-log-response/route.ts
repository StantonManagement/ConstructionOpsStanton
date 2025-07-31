import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json();
    
    // Extract SMS data (this will depend on your SMS provider - Twilio, etc.)
    const {
      From: fromPhone,
      Body: messageBody,
      // Add other fields as needed for your SMS provider
    } = body;

    console.log('Received SMS response:', { fromPhone, messageBody });

    if (!fromPhone || !messageBody) {
      console.error('Missing required SMS data');
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Find the pending daily log request for this phone number
    const { data: requests, error } = await supabase
      .from('daily_log_requests')
      .select(`
        *,
        project:projects(name, client_name)
      `)
      .eq('pm_phone_number', fromPhone)
      .eq('request_status', 'sent')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching daily log requests:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!requests || requests.length === 0) {
      console.log('No pending daily log request found for phone number:', fromPhone);
      return NextResponse.json({ message: 'No pending request found' });
    }

    const request = requests[0];

    // Update the request with the received notes
    const { error: updateError } = await supabase
      .from('daily_log_requests')
      .update({
        request_status: 'received',
        received_notes: messageBody.trim(),
        received_at: new Date().toISOString()
      })
      .eq('id', request.id);

    if (updateError) {
      console.error('Error updating daily log request:', updateError);
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
    }

    console.log(`Successfully received daily log for project: ${request.project.name}`);

    // Send confirmation SMS back to the PM
    const confirmationMessage = `Thank you! Your daily log for project "${request.project.name}" has been received and recorded.`;

    // You can implement sending a confirmation SMS here if needed
    // await sendSMS(fromPhone, confirmationMessage);

    return NextResponse.json({
      message: 'Daily log received successfully',
      project_name: request.project.name,
      notes: messageBody.trim()
    });

  } catch (error) {
    console.error('Error processing daily log response:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 