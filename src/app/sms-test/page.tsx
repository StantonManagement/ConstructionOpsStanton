"use client";

import React, { useState } from 'react';

const SMS_TEST_API = '/api/sms/webhook';

export default function SmsTestPage() {
  const [phone, setPhone] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ from: 'user' | 'system'; text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!phone || !input) return;
    setMessages((msgs) => [...msgs, { from: 'user', text: input }]);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('From', phone);
      formData.append('Body', input);
      const res = await fetch(SMS_TEST_API, {
        method: 'POST',
        body: formData,
      });
      const text = await res.text();
      // Try to extract the message from the TwiML XML
      const match = text.match(/<Message>([\s\S]*?)<\/Message>/i);
      const reply = match ? match[1].trim() : text;
      setMessages((msgs) => [...msgs, { from: 'system', text: reply }]);
    } catch (err) {
      setMessages((msgs) => [...msgs, { from: 'system', text: 'Error sending message.' }]);
    }
    setInput('');
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', padding: 24, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>SMS Conversation Test</h2>
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Phone number (e.g. +15555555555)"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          style={{ width: '100%', marginBottom: 8, padding: 8 }}
        />
      </div>
      <div style={{ minHeight: 200, background: '#fafafa', padding: 12, borderRadius: 4, marginBottom: 16, border: '1px solid #eee' }}>
        {messages.length === 0 && <div style={{ color: '#888' }}>No messages yet.</div>}
        {messages.map((msg, i) => (
          <div key={i} style={{ textAlign: msg.from === 'user' ? 'right' : 'left', margin: '8px 0' }}>
            <span style={{
              display: 'inline-block',
              background: msg.from === 'user' ? '#d1e7dd' : '#e2e3e5',
              color: '#222',
              borderRadius: 16,
              padding: '8px 14px',
              maxWidth: '80%',
              wordBreak: 'break-word',
            }}>{msg.text}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ flex: 1, padding: 8 }}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input || !phone} style={{ padding: '8px 16px' }}>
          Send
        </button>
      </div>
    </div>
  );
} 