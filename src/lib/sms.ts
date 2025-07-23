// SMS service with Twilio
// TODO: Implement Twilio integration

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
  // Handle incoming SMS webhook
}
