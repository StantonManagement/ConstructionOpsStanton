import { NextRequest, NextResponse } from 'next/server';
import { withAuth, successResponse, errorResponse } from '@/lib/apiHelpers';

/**
 * Test Webhook Simulator
 * Simulates a Twilio SMS webhook for testing without needing actual SMS
 *
 * Usage:
 * POST /api/webhooks/twilio/test-webhook
 * Body: { phone: "+18603516816", message: "$777" }
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { phone, message } = await request.json();

    if (!phone || !message) {
      return errorResponse('phone and message are required', 400, 'VALIDATION_ERROR');
    }

    // Simulate Twilio's webhook format
    const formData = new FormData();
    formData.append('From', phone);
    formData.append('Body', message);
    formData.append('MessageSid', `TEST_${Date.now()}`);
    formData.append('AccountSid', 'TEST_ACCOUNT');
    formData.append('To', process.env.TWILIO_PHONE_NUMBER || '+18606891617');

    // Call the actual webhook endpoint
    const webhookUrl = new URL('/api/webhooks/twilio/sms-incoming', request.url);

    const response = await fetch(webhookUrl.toString(), {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    return successResponse({
      message: 'Test webhook sent successfully',
      webhookResponse: result,
      simulatedData: {
        From: phone,
        Body: message,
        MessageSid: `TEST_${Date.now()}`,
      },
    });

  } catch (error) {
    console.error('[Test Webhook] Error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to send test webhook',
      500,
      'INTERNAL_ERROR'
    );
  }
});

/**
 * GET endpoint - Show usage instructions
 */
export async function GET() {
  return NextResponse.json({
    service: 'Twilio Webhook Test Simulator',
    description: 'Test SMS webhook functionality without sending actual SMS messages',
    usage: {
      method: 'POST',
      endpoint: '/api/webhooks/twilio/test-webhook',
      body: {
        phone: 'string (e.g., "+18603516816")',
        message: 'string (e.g., "$777" or "25000")',
      },
      example: {
        phone: '+18603516816',
        message: '$777',
      },
    },
    testSteps: [
      '1. Ensure you have an active bid round in the system',
      '2. Ensure bid notifications were sent to the test phone number',
      '3. Send a POST request to this endpoint with phone and message',
      '4. Check the response to see if bid was created/updated',
      '5. Verify in database that bid record was created',
    ],
    curl: 'curl -X POST http://localhost:3000/api/webhooks/twilio/test-webhook -H "Content-Type: application/json" -d \'{"phone":"+18603516816","message":"$777"}\'',
  });
}
