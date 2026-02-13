'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  MessageSquare,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Send,
  Loader2,
} from 'lucide-react';

interface Notification {
  id: number;
  bid_round_id: number;
  contractor_id: number;
  notification_type: 'sms';
  phone_number?: string;
  message_content: string;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'read';
  sent_at: string;
  delivered_at?: string;
  read_at?: string;
  error_message?: string;
  contractor?: {
    id: number;
    name: string;
  };
}

interface NotificationHistoryProps {
  bidRoundId: number;
}

export default function NotificationHistory({ bidRoundId }: NotificationHistoryProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();

    // Set up realtime subscription for status updates
    const channel = supabase
      .channel(`bid_notifications_${bidRoundId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bid_notifications',
          filter: `bid_round_id=eq.${bidRoundId}`,
        },
        () => {
          // Refresh notifications when there's a change
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bidRoundId]);

  async function fetchNotifications() {
    try {
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from('bid_notifications')
        .select(
          `
          *,
          contractor:contractors(id, name)
        `
        )
        .eq('bid_round_id', bidRoundId)
        .order('sent_at', { ascending: false });

      if (fetchError) throw fetchError;

      setNotifications(data || []);
      setError(null);
    } catch (err) {
      console.error('[NOTIFICATION HISTORY] Error fetching notifications:', err);
      setError('Failed to load notification history');
    } finally {
      setLoading(false);
    }
  }

  const getStatusIcon = (status: Notification['status']) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'read':
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
      case 'sent':
        return <Send className="w-4 h-4 text-blue-500" />;
      case 'sending':
      case 'queued':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: Notification['status']) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'read':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'sent':
        return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'sending':
      case 'queued':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading notification history...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center text-red-700">
          <XCircle className="w-5 h-5 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No SMS notifications sent yet</p>
        <p className="text-sm text-gray-500 mt-1">
          Use the &quot;Send SMS&quot; button to notify contractors
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">SMS Notification History</h3>
        <p className="text-sm text-gray-500 mt-1">
          Track delivery status of SMS invitations sent to contractors
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {notifications.map((notification) => (
          <div key={notification.id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                {/* SMS Icon */}
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-700" />
                </div>

                {/* Notification Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-gray-900">
                      {notification.contractor?.name || 'Unknown Contractor'}
                    </p>
                    <span className="text-sm text-gray-500">
                      {notification.phone_number}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="mt-2 flex items-center space-x-2">
                    <div
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        notification.status
                      )}`}
                    >
                      {getStatusIcon(notification.status)}
                      <span className="capitalize">{notification.status}</span>
                    </div>

                    {/* Timestamps */}
                    <div className="text-xs text-gray-500 space-x-3">
                      <span>Sent: {formatTimestamp(notification.sent_at)}</span>
                      {notification.delivered_at && (
                        <span>Delivered: {formatTimestamp(notification.delivered_at)}</span>
                      )}
                      {notification.read_at && (
                        <span>Read: {formatTimestamp(notification.read_at)}</span>
                      )}
                    </div>
                  </div>

                  {/* Error Message */}
                  {notification.error_message && (
                    <div className="mt-2 flex items-start space-x-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{notification.error_message}</span>
                    </div>
                  )}

                  {/* Message Preview */}
                  <details className="mt-2 text-sm text-gray-600">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
                      View message
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200 whitespace-pre-wrap">
                      {notification.message_content}
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
