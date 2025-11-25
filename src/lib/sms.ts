// SMS service with Twilio
// Integration is handled via /api/sms/* endpoints

export async function sendSMS(to: string, message: string) {
  // Call the backend API route to send SMS via Twilio
  const res = await fetch('/api/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, message }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to send SMS');
  }
  return res.json();
}

export function processWebhook(req: any) {
  // Webhook processing is handled in /api/sms/webhook/route.ts
  // This stub is kept for reference or future shared logic
  throw new Error("Use /api/sms/webhook endpoint for webhook processing");
}
