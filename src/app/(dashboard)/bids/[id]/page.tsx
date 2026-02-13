'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AppLayout from '@/app/components/AppLayout';
import PageContainer from '@/app/components/PageContainer';
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Trash2,
  DollarSign,
  FileText,
  Calendar,
  User,
  Building,
  Loader2,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { Bid } from '@/types/bid';

export default function BidDetailPage() {
  const router = useRouter();
  const params = useParams();
  const bidId = params.id as string;

  const [bid, setBid] = useState<Bid | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    amount: '',
    notes: '',
    pm_notes: '',
    status: '',
    actual_cost: '',
    change_orders_total: '',
  });

  useEffect(() => {
    loadBid();
  }, [bidId]);

  const loadBid = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        router.push('/auth');
        return;
      }

      const response = await fetch(`/api/bids/${bidId}`, {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Bid not found');
        }
        throw new Error('Failed to load bid');
      }

      const result = await response.json();
      const bidData = result.data;
      setBid(bidData);

      // Initialize edit form
      setEditForm({
        amount: bidData.amount?.toString() || '',
        notes: bidData.notes || '',
        pm_notes: bidData.pm_notes || '',
        status: bidData.status || 'draft',
        actual_cost: bidData.actual_cost?.toString() || '',
        change_orders_total: bidData.change_orders_total?.toString() || '',
      });
    } catch (err: unknown) {
      console.error('Error loading bid:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bid');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        router.push('/auth');
        return;
      }

      const updateData: Record<string, string | number | undefined> = {
        amount: parseFloat(editForm.amount),
        notes: editForm.notes || undefined,
        pm_notes: editForm.pm_notes || undefined,
        status: editForm.status,
      };

      if (editForm.actual_cost) {
        updateData.actual_cost = parseFloat(editForm.actual_cost);
      }
      if (editForm.change_orders_total) {
        updateData.change_orders_total = parseFloat(editForm.change_orders_total);
      }

      const response = await fetch(`/api/bids/${bidId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update bid');
      }

      const result = await response.json();
      setBid(result.data);
      setIsEditing(false);
    } catch (err: unknown) {
      console.error('Error updating bid:', err);
      setError(err instanceof Error ? err.message : 'Failed to update bid');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this bid? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);

      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        router.push('/auth');
        return;
      }

      const response = await fetch(`/api/bids/${bidId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete bid');
      }

      router.push('/bids');
    } catch (err: unknown) {
      console.error('Error deleting bid:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete bid');
      setDeleting(false);
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      won: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      lost: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      declined: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      withdrawn: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    };

    return (
      <span className={`text-xs px-3 py-1 rounded-full font-medium ${styles[status] || styles.draft}`}>
        {status}
      </span>
    );
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'photo':
        return '📷 Photo';
      case 'pdf':
        return '📄 PDF';
      case 'voice':
        return '🎤 Voice';
      case 'sms':
        return '💬 SMS';
      default:
        return '✍️ Manual';
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <PageContainer>
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </PageContainer>
      </AppLayout>
    );
  }

  if (error && !bid) {
    return (
      <AppLayout>
        <PageContainer>
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Error</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <button
              onClick={() => router.push('/bids')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Back to Bids
            </button>
          </div>
        </PageContainer>
      </AppLayout>
    );
  }

  if (!bid) {
    return null;
  }

  return (
    <AppLayout>
      <PageContainer>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/bids')}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Bid Details</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {bid.contractor?.name || 'Unknown Contractor'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setError(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Basic Information</h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground mb-1">Contractor</div>
                    <div className="text-base font-medium text-foreground">
                      {bid.contractor?.name || 'Unknown'}
                    </div>
                    {bid.contractor?.phone && (
                      <div className="text-sm text-muted-foreground">{bid.contractor.phone}</div>
                    )}
                    {bid.contractor?.email && (
                      <div className="text-sm text-muted-foreground">{bid.contractor.email}</div>
                    )}
                  </div>
                </div>

                {bid.project && (
                  <div className="flex items-start gap-3">
                    <Building className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground mb-1">Project</div>
                      <div className="text-base font-medium text-foreground">{bid.project.name}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground mb-1">Bid Amount</div>
                    {isEditing ? (
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.amount}
                          onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                          className="w-full pl-7 pr-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>
                    ) : (
                      <div className="text-xl font-bold text-foreground">
                        {formatCurrency(bid.amount)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground mb-1">Source</div>
                    <div className="text-base text-foreground">{getSourceIcon(bid.source_type)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status & Dates */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Status & Dates</h2>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Status</div>
                  {isEditing ? (
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="draft">Draft</option>
                      <option value="submitted">Submitted</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                      <option value="declined">Declined</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                  ) : (
                    <div>{getStatusBadge(bid.status)}</div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Created</div>
                    <div className="text-sm text-foreground">{formatDate(bid.created_at)}</div>
                  </div>
                  {bid.submitted_at && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Submitted</div>
                      <div className="text-sm text-foreground">{formatDate(bid.submitted_at)}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Notes</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Bid Notes
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                      rows={4}
                      placeholder="Scope of work, exclusions, special conditions..."
                    />
                  ) : (
                    <div className="text-sm text-foreground whitespace-pre-wrap">
                      {bid.notes || <span className="text-muted-foreground italic">No notes</span>}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    PM Notes
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editForm.pm_notes}
                      onChange={(e) => setEditForm({ ...editForm, pm_notes: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                      rows={4}
                      placeholder="Project manager notes, observations, concerns..."
                    />
                  ) : (
                    <div className="text-sm text-foreground whitespace-pre-wrap">
                      {bid.pm_notes || <span className="text-muted-foreground italic">No PM notes</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cost Tracking */}
            {(bid.status === 'won' || isEditing) && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Cost Tracking</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Actual Cost
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.actual_cost}
                          onChange={(e) => setEditForm({ ...editForm, actual_cost: e.target.value })}
                          className="w-full pl-7 pr-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                          placeholder="0.00"
                        />
                      </div>
                    ) : (
                      <div className="text-lg font-semibold text-foreground">
                        {formatCurrency(bid.actual_cost)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Change Orders Total
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.change_orders_total}
                          onChange={(e) => setEditForm({ ...editForm, change_orders_total: e.target.value })}
                          className="w-full pl-7 pr-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
                          placeholder="0.00"
                        />
                      </div>
                    ) : (
                      <div className="text-lg font-semibold text-foreground">
                        {formatCurrency(bid.change_orders_total)}
                      </div>
                    )}
                  </div>

                  {bid.variance_percent !== undefined && bid.variance_percent !== null && (
                    <div className="pt-4 border-t border-border">
                      <div className="text-sm text-muted-foreground mb-1">Variance</div>
                      <div className={`text-2xl font-bold ${
                        bid.variance_percent > 10 ? 'text-red-600' :
                        bid.variance_percent > 5 ? 'text-orange-600' :
                        bid.variance_percent > 0 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {bid.variance_percent > 0 ? '+' : ''}{bid.variance_percent.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {bid.variance_percent > 0 ? 'Over budget' : 'Under budget'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Bid ID</span>
                  <span className="text-sm font-medium text-foreground">#{bid.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Last Updated</span>
                  <span className="text-sm font-medium text-foreground">
                    {formatDate(bid.updated_at)}
                  </span>
                </div>
                {bid.bid_round && (
                  <div className="pt-2 border-t border-border">
                    <div className="text-xs text-muted-foreground mb-1">Bid Round</div>
                    <div className="text-sm font-medium text-foreground">{bid.bid_round.name}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Document */}
            {bid.source_url && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Attached Document</h3>
                <a
                  href={bid.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Document
                </a>
              </div>
            )}

            {/* Scope Coverage */}
            {bid.scope_coverage && bid.scope_coverage.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Scope Coverage</h3>
                <div className="space-y-2">
                  {bid.scope_coverage.map((item, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className={`text-xs mt-0.5 ${item.included ? 'text-green-600' : 'text-red-600'}`}>
                        {item.included ? '✓' : '✗'}
                      </span>
                      <div className="flex-1">
                        <div className="text-sm text-foreground">{item.item}</div>
                        {item.notes && (
                          <div className="text-xs text-muted-foreground mt-0.5">{item.notes}</div>
                        )}
                        {item.add_cost !== undefined && item.add_cost > 0 && (
                          <div className="text-xs text-orange-600 mt-0.5">
                            +{formatCurrency(item.add_cost)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  );
}
