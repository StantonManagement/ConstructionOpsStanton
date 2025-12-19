'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { ApiResponse } from '@/types/schema';

interface SMSLog {
  id: string;
  task_id: string;
  phone_number: string;
  message_type: string;
  message_body: string;
  status: string;
  sent_at: string;
  error_message?: string;
  task?: { name: string; location: { name: string } };
  contractor?: { name: string };
}

const fetchSMSLogs = async (): Promise<SMSLog[]> => {
  // We need to create this API endpoint if it doesn't exist, but for now we'll assume it might be added later.
  // Or we can query supabase directly if we expose it via generic table endpoint, but better to have dedicated.
  // For this optional task, I'll mock the fetch or assume endpoint /api/sms-logs exists.
  // Let's creating the API route first.
  const res = await fetch('/api/sms-logs');
  if (!res.ok) throw new Error('Failed to fetch logs');
  const json: ApiResponse<SMSLog[]> = await res.json();
  return json.data || [];
};

export default function SMSLogPage() {
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['sms-logs'],
    queryFn: fetchSMSLogs,
    retry: false
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-600" />
          SMS Notification Log
        </h1>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading logs...</div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No messages logged yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 uppercase font-medium text-xs">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Recipient</th>
                    <th className="px-4 py-3">Message</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {new Date(log.sent_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium capitalize">
                          {log.message_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{log.contractor?.name || log.phone_number}</div>
                        <div className="text-xs text-gray-500">{log.phone_number}</div>
                      </td>
                      <td className="px-4 py-3 max-w-md truncate" title={log.message_body}>
                        {log.message_body}
                      </td>
                      <td className="px-4 py-3">
                        {log.status === 'sent' || log.status === 'delivered' ? (
                          <div className="flex items-center text-green-600 gap-1.5">
                            <CheckCircle className="w-4 h-4" />
                            <span className="capitalize">{log.status}</span>
                          </div>
                        ) : log.status === 'failed' ? (
                          <div className="flex items-center text-red-600 gap-1.5" title={log.error_message}>
                            <AlertCircle className="w-4 h-4" />
                            <span>Failed</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-gray-500 gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span className="capitalize">{log.status}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
