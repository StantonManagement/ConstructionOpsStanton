'use client';

import { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import AppLayout from '@/app/components/AppLayout';
import { authFetch } from '@/lib/authFetch';
import { CheckCircle, XCircle, AlertCircle, Send, Loader2 } from 'lucide-react';

export default function TestWebhookPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [phone, setPhone] = useState('+18603516816');
  const [message, setMessage] = useState('$777');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    setError(null);

    try {
      const response = await authFetch('/api/webhooks/twilio/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, message }),
      });

      if (!response.ok) {
        throw new Error('Test failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!user) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Please log in to access this page.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Twilio Webhook Tester
          </h1>
          <p className="text-muted-foreground">
            Test SMS webhook functionality without sending actual SMS messages
          </p>
        </div>

        {/* Test Form */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 860 351 6816"
                className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use the phone number that received the bid invitation
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Message
              </label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="$777"
                className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter bid amount (e.g., "$777", "25000", "25k")
              </p>
            </div>

            <button
              onClick={handleTest}
              disabled={testing || !phone || !message}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Send Test Webhook</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Test Failed</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">Test Successful</h3>
                <p className="text-green-700 text-sm">{result.message}</p>
              </div>
            </div>

            {result.webhookResponse && (
              <div className="mt-4 p-4 bg-white rounded border border-green-200">
                <h4 className="font-medium text-foreground mb-2">Webhook Response:</h4>
                <pre className="text-xs text-muted-foreground overflow-auto">
                  {JSON.stringify(result.webhookResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Setup Requirements</h3>
              <ol className="text-blue-700 text-sm space-y-2 list-decimal list-inside">
                <li>Create a bid round in the system (status: "active")</li>
                <li>Send bid invitations to contractors via SMS</li>
                <li>Use the same phone number that received the invitation</li>
                <li>Enter a bid amount in the message field</li>
                <li>Click "Send Test Webhook" to simulate the SMS reply</li>
              </ol>
              <p className="mt-4 text-sm text-blue-700">
                <strong>Note:</strong> This tests the webhook logic without requiring Twilio
                configuration. For production, you must configure Twilio to send webhooks to
                your server.
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Info */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium text-foreground mb-2">Twilio Configuration</h4>
          <p className="text-sm text-muted-foreground mb-2">
            To enable actual SMS replies, configure Twilio webhook:
          </p>
          <code className="block text-xs bg-background p-2 rounded border border-border">
            {typeof window !== 'undefined'
              ? `${window.location.origin}/api/webhooks/twilio/sms-incoming`
              : '/api/webhooks/twilio/sms-incoming'}
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            See <code>TWILIO_WEBHOOK_SETUP.md</code> for detailed instructions
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
