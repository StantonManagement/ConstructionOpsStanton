import { NextRequest, NextResponse } from 'next/server';
import { twilioClient, TWILIO_PHONE_NUMBER } from '@/lib/twilioClient';

export async function POST(req: NextRequest) {
  try {
    const { to, message } = await req.json();
    console.log('[SMS SEND] Incoming request:', { to, message });
    if (!to || !message) {
      console.warn('[SMS SEND] Missing to or message', { to, message });
      return NextResponse.json({ error: 'Missing to or message' }, { status: 400 });
    }

    if (!twilioClient || !TWILIO_PHONE_NUMBER) {
      console.error('[SMS SEND] Twilio not configured');
      return NextResponse.json({ error: 'SMS service not configured' }, { status: 503 });
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to,
    });
    console.log('[SMS SEND] SMS sent successfully', { to, sid: result.sid });
    return NextResponse.json({ success: true, sid: result.sid });
  } catch (err) {
    let message = 'Unknown error';
    if (typeof err === 'object' && err && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
      message = (err as { message: string }).message;
    }
    console.error('[SMS SEND] Error sending SMS', { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 