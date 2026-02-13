import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import crypto from 'crypto';

/**
 * Twilio SMS Status Webhook
 *
 * Receives status updates from Twilio when SMS messages are sent, delivered, or fail.
 * Updates the bid_notifications table with delivery status.
 *
 * Twilio will POST to this endpoint with the following parameters:
 * - MessageSid: Unique identifier for the message
 * - MessageStatus: queued, sending, sent, delivered, undelivered, failed
 * - ErrorCode: If status is failed or undelivered
 * - ErrorMessage: Description of the error
 */

// Twilio webhook authentication
function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken) {
    console.error('[TWILIO WEBHOOK] Missing TWILIO_AUTH_TOKEN');
    return false;
  }

  // Sort parameters alphabetically and concatenate
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);

  // Create HMAC SHA256 signature
  const hmac = crypto.createHmac('sha256', authToken);
  const expectedSignature = hmac.update(data).digest('base64');

  return signature === expectedSignature;
}

export async function POST(req: NextRequest) {
  try {
    console.log('[TWILIO WEBHOOK] Received SMS status update');

    // Get the request body
    const formData = await req.formData();
    const params: Record<string, string> = {};

    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    console.log('[TWILIO WEBHOOK] Params:', params);

    // Validate Twilio signature for security
    const twilioSignature = req.headers.get('x-twilio-signature');
    const url = req.url;

    if (twilioSignature && !validateTwilioSignature(url, params, twilioSignature)) {
      console.error('[TWILIO WEBHOOK] Invalid signature - possible spoofing attempt');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      );
    }

    // Extract Twilio parameters
    const {
      MessageSid,
      MessageStatus,
      ErrorCode,
      ErrorMessage,
      To,
      From,
    } = params;

    if (!MessageSid || !MessageStatus) {
      console.error('[TWILIO WEBHOOK] Missing required parameters');
      return NextResponse.json(
        { error: 'Missing MessageSid or MessageStatus' },
        { status: 400 }
      );
    }

    // Map Twilio status to our status
    const statusMap: Record<string, string> = {
      'queued': 'queued',
      'sending': 'sending',
      'sent': 'sent',
      'delivered': 'delivered',
      'undelivered': 'failed',
      'failed': 'failed',
      'read': 'read', // For WhatsApp/RCS
    };

    const mappedStatus = statusMap[MessageStatus] || MessageStatus;

    if (!supabaseAdmin) {
      console.error('[Twilio Webhook] Supabase admin client not available');
      return NextResponse.json(
        { error: 'Database client not available' },
        { status: 500 }
      );
    }

    // Update the bid_notification record
    const updateData: {
      status: string;
      error_message?: string;
      delivered_at?: string;
      read_at?: string;
    } = {
      status: mappedStatus,
    };

    // Add error details if applicable
    if (ErrorCode || ErrorMessage) {
      updateData.error_message = ErrorMessage || `Error code: ${ErrorCode}`;
    }

    // Add timestamps for specific statuses
    if (MessageStatus === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    } else if (MessageStatus === 'read') {
      updateData.read_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('bid_notifications')
      .update(updateData)
      .eq('twilio_sid', MessageSid)
      .select()
      .single();

    if (error) {
      console.error('[TWILIO WEBHOOK] Error updating notification:', error);

      // If record not found, log it but still return 200 to Twilio
      if (error.code === 'PGRST116') {
        console.warn('[TWILIO WEBHOOK] Notification record not found for SID:', MessageSid);
        return NextResponse.json({
          success: true,
          message: 'Record not found but acknowledged'
        });
      }

      throw error;
    }

    console.log('[TWILIO WEBHOOK] Updated notification:', {
      id: data?.id,
      status: mappedStatus,
      twilio_sid: MessageSid,
    });

    // Return 200 to acknowledge receipt to Twilio
    return NextResponse.json({
      success: true,
      message: 'Status updated',
      data: {
        notification_id: data?.id,
        status: mappedStatus,
      },
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[TWILIO WEBHOOK] Error:', errorMessage);

    // Always return 200 to Twilio to prevent retries
    // Log the error for debugging but don't fail the webhook
    return NextResponse.json({
      success: false,
      error: errorMessage,
    });
  }
}

// GET endpoint for webhook verification (optional)
export async function GET() {
  return NextResponse.json({
    service: 'Twilio SMS Status Webhook',
    status: 'active',
    endpoint: '/api/webhooks/twilio/sms-status',
  });
}
