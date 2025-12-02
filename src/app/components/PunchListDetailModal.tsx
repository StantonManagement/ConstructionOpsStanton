'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { PunchListItem, PunchListComment } from '@/types/punch-list';

interface PunchListDetailModalProps {
  item: PunchListItem;
  onClose: () => void;
  onUpdate: () => void;
}

export default function PunchListDetailModal({ item, onClose, onUpdate }: PunchListDetailModalProps) {
  const [comments, setComments] = useState<PunchListComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch comments
  useEffect(() => {
    fetchComments();
  }, [item.id]);

  const fetchComments = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const response = await fetch(`/api/punch-list/${item.id}/comments`, {
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setComments(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const response = await fetch(`/api/punch-list/${item.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ comment_text: newComment }),
      });

      if (response.ok) {
        setNewComment('');
        await fetchComments();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusAction = async (action: 'complete' | 'verify' | 'reject', rejectReason?: string) => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const endpoint = `/api/punch-list/${item.id}/${action}`;
      const body = action === 'reject' && rejectReason ? { rejection_reason: rejectReason } : {};

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error(`Error ${action}ing item:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this punch list item?')) return;

    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      const response = await fetch(`/api/punch-list/${item.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      });

      if (response.ok) {
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-primary';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'verified': return 'bg-emerald-100 text-emerald-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = item.due_date && item.due_date < new Date().toISOString().split('T')[0] && !['verified', 'completed'].includes(item.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-bold text-gray-900">{item.item_number}</h3>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(item.status)}`}>
                  {item.status.replace('_', ' ')}
                </span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getSeverityColor(item.severity)}`}>
                  {item.severity}
                </span>
              </div>
              <p className="text-gray-600">{item.project_name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Left Side */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
                <p className="text-gray-900">{item.description}</p>
              </div>

              {/* Location Info */}
              {(item.location || item.unit_number) && (
                <div className="grid grid-cols-2 gap-4">
                  {item.location && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Location</h4>
                      <p className="text-gray-900">📍 {item.location}</p>
                    </div>
                  )}
                  {item.unit_number && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Unit</h4>
                      <p className="text-gray-900">{item.unit_number}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {item.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes</h4>
                  <p className="text-gray-700">{item.notes}</p>
                </div>
              )}

              {/* Comments Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Comments ({comments.length})</h4>
                
                {/* Comment List */}
                <div className="space-y-3 mb-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{comment.author_name || 'Unknown'}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.comment_text}</p>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No comments yet</p>
                  )}
                </div>

                {/* Add Comment */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={submitting || !newComment.trim()}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? '...' : 'Add'}
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar - Right Side */}
            <div className="space-y-6">
              {/* Details Card */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-gray-900 mb-3">Details</h4>
                
                {item.trade_category && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Category</div>
                    <div className="text-sm text-gray-900">{item.trade_category}</div>
                  </div>
                )}

                {item.assigned_contractor_name && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Assigned To</div>
                    <div className="text-sm text-gray-900">{item.assigned_contractor_name}</div>
                  </div>
                )}

                {item.due_date && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Due Date</div>
                    <div className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                      {new Date(item.due_date).toLocaleDateString()}
                      {isOverdue && <span className="ml-2 text-xs">(Overdue)</span>}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-gray-500 mb-1">Created</div>
                  <div className="text-sm text-gray-900">
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>

                {item.completed_date && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Completed</div>
                    <div className="text-sm text-gray-900">
                      {new Date(item.completed_date).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {item.verified_date && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Verified</div>
                    <div className="text-sm text-gray-900">
                      {new Date(item.verified_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 mb-3">Actions</h4>
                
                {item.status === 'open' && (
                  <button
                    onClick={() => handleStatusAction('complete')}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Mark Complete
                  </button>
                )}

                {item.status === 'in_progress' && (
                  <button
                    onClick={() => handleStatusAction('complete')}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Mark Complete
                  </button>
                )}

                {item.status === 'completed' && (
                  <>
                    <button
                      onClick={() => handleStatusAction('verify')}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      Verify Complete
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Reason for rejection:');
                        if (reason) handleStatusAction('reject', reason);
                      }}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      Reject & Reopen
                    </button>
                  </>
                )}

                {item.status !== 'verified' && (
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    Delete Item
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




