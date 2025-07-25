import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export async function POST(req: NextRequest) {
  try {
    const {
      contractorId,
      contractorName,
      contractorPhone,
      contractorEmail,
      projectName,
      paymentAppId,
      approvedAmount,
      approvalNotes,
      type
    } = await req.json();

    if (!contractorId || !contractorName || !projectName || !paymentAppId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

    const formattedAmount = formatCurrency(approvedAmount || 0);

    // Prepare notification message
    let message = '';
    if (type === 'approval') {
      message = `🎉 Great news ${contractorName}! Your payment application for ${projectName} (${formattedAmount}) has been APPROVED by the project manager.`;
      
      if (approvalNotes) {
        message += `\n\nPM Notes: ${approvalNotes}`;
      }
      
      message += '\n\nYour payment will be processed according to the contract terms. Thank you for your quality work!';
    }

    const results: {
      sms: { status: string; sid?: string; error?: string } | null;
      email: { status: string; error?: string } | null;
      notification_logged: boolean;
    } = {
      sms: null,
      email: null,
      notification_logged: false
    };

    // Send SMS notification if phone number is available
    if (contractorPhone && TWILIO_PHONE_NUMBER) {
      try {
        const smsResult = await twilioClient.messages.create({
          body: message,
          from: TWILIO_PHONE_NUMBER,
          to: contractorPhone,
        });
        results.sms = { status: 'sent', sid: smsResult.sid };
      } catch (smsError) {
        console.error('SMS sending failed:', smsError);
        results.sms = { status: 'failed', error: (smsError as Error).message };
      }
    }

    // Log notification in database
    try {
      const { error: logError } = await supabase
        .from('notification_logs')
        .insert({
          type: 'vendor_notification',
          recipient_type: 'contractor',
          recipient_id: contractorId,
          payment_app_id: paymentAppId,
          message: message,
          channels: {
            sms: !!contractorPhone,
            email: !!contractorEmail
          },
          status: results.sms?.status || 'no_contact_method',
          sent_at: new Date().toISOString()
        });

      if (logError) {
        console.error('Failed to log notification:', logError);
      } else {
        results.notification_logged = true;
      }
    } catch (logError) {
      console.error('Failed to log notification:', logError);
    }

    // Determine overall success
    const hasContactMethod = contractorPhone || contractorEmail;
    const smsSuccess = !contractorPhone || results.sms?.status === 'sent';
    
    if (!hasContactMethod) {
      return NextResponse.json({
        success: false,
        error: 'No contact method available for contractor',
        results
      }, { status: 400 });
    }

    if (!smsSuccess) {
      return NextResponse.json({
        success: false,
        error: 'Failed to send notification',
        results
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Vendor notification sent successfully',
      results
    });

  } catch (error) {
    console.error('Vendor notification error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send vendor notification',
      details: (error as Error).message
    }, { status: 500 });
  }
}