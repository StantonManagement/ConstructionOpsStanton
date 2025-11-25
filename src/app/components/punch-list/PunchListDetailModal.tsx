'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Camera, MessageSquare, MapPin, Calendar, User } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { PunchListItem, PunchListStatus } from '@/types/punch-list';
import { SignalBadge } from '@/components/ui/SignalBadge';

interface PunchListDetailModalProps {
  item: PunchListItem;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PunchListDetailModal({ item: initialItem, onClose, onUpdate }: PunchListDetailModalProps) {
  const [item, setItem] = useState<PunchListItem>(initialItem);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Refresh item data on mount to get latest status/details
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.access_token) return;

        const response = await fetch(`/api/punch-list/${initialItem.id}`, {
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.data) {
            setItem(result.data);
          }
        }
      } catch (error) {
        console.error('Error fetching punch item detail:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [initialItem.id]);

  const handleStatusUpdate = async (action: 'complete' | 'verify' | 'reject') => {
    try {
      setActionLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const response = await fetch(`/api/punch-list/${item.id}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setItem(result.data);
        onUpdate(); // Notify parent to refresh list
      } else {
        alert(`Failed to ${action} item`);
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      alert(`Error performing ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg font-bold text-gray-900">{item.item_number}</span>
              <SignalBadge status={
                item.status === 'verified' ? 'success' :
                item.status === 'rejected' ? 'critical' :
                'neutral'
              }>
                {item.status.replace('_', ' ')}
              </SignalBadge>
              <span className={`px-2 py-0.5 text-xs rounded-full border ${
                item.severity === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                item.severity === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                'bg-gray-50 text-gray-700 border-gray-200'
              }`}>
                {item.severity} priority
              </span>
            </div>
            <h2 className="text-xl text-gray-900 font-medium">{item.description}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin size={18} />
                <span className="font-medium">Location:</span>
                <span>{item.location || '—'} {item.unit_number ? `(Unit ${item.unit_number})` : ''}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <User size={18} />
                <span className="font-medium">Assigned To:</span>
                <span>{item.assigned_contractor_name || 'Unassigned'}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar size={18} />
                <span className="font-medium">Due Date:</span>
                <span className={item.due_date && item.due_date < new Date().toISOString().split('T')[0] && item.status !== 'verified' ? 'text-red-600 font-medium' : ''}>
                  {item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium">Category:</span>
                <span>{item.trade_category || '—'}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {item.notes && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}

          {/* Photos Placeholder */}
          <div className="border rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Camera size={18} />
                Photos ({item.photo_count || 0})
              </h3>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                + Add Photo
              </button>
            </div>
            <div className="bg-gray-100 rounded-lg h-32 flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-300">
              Photo Gallery Component Coming Soon
            </div>
          </div>

          {/* Comments Placeholder */}
          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <MessageSquare size={18} />
                Comments ({item.comment_count || 0})
              </h3>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <textarea
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add a comment..."
                  rows={2}
                />
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium">
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          {item.status === 'open' || item.status === 'in_progress' || item.status === 'rejected' ? (
            <button
              onClick={() => handleStatusUpdate('complete')}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <CheckCircle size={18} />
              Mark Complete
            </button>
          ) : null}

          {item.status === 'completed' ? (
            <>
              <button
                onClick={() => handleStatusUpdate('reject')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50"
              >
                <AlertCircle size={18} />
                Reject
              </button>
              <button
                onClick={() => handleStatusUpdate('verify')}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle size={18} />
                Verify
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}



