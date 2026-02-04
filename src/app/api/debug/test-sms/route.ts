import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to simulate SMS webhook without Twilio
 * Usage: POST /api/debug/test-sms
 * Body: { "phone": "+15551234567", "message": "YES" }
 */
export async function POST(req: NextRequest) {
  const { phone, message } = await req.json();

  if (!phone || !message) {
    return NextResponse.json({ error: 'phone and message required' }, { status: 400 });
  }

  // Simulate Twilio webhook format
  const formData = new URLSearchParams();
  formData.append('From', phone);
  formData.append('Body', message);

  // Call the actual webhook
  const webhookUrl = new URL('/api/sms/webhook', req.url);
  const response = await fetch(webhookUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const responseText = await response.text();

  return NextResponse.json({
    status: response.status,
    response: responseText,
    sent: { phone, message }
  });
}
