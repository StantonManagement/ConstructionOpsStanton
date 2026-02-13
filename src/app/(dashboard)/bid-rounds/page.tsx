'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AppLayout from '@/app/components/AppLayout';
import PageContainer from '@/app/components/PageContainer';
import { Plus, Clock, CheckCircle, XCircle, Loader2, Filter, Users, FileText, Edit2, Trash2, DollarSign } from 'lucide-react';
import { BidRound, BidScopeTemplate, Bid } from '@/types/bid';
import BidRoundCreateModal from '@/components/bid-rounds/BidRoundCreateModal';
import ScopeTemplateCreateModal from '@/components/scope-templates/ScopeTemplateCreateModal';
import BidCaptureModal from '@/components/modals/BidCaptureModal';

export default function BidRoundsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'bid-rounds' | 'templates' | 'bids'>(
    (searchParams?.get('tab') as 'bid-rounds' | 'templates' | 'bids') || 'bid-rounds'
  );

  // Bid Rounds state
  const [bidRounds, setBidRounds] = useState<BidRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<BidScopeTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [showTemplateCreateModal, setShowTemplateCreateModal] = useState(false);

  // Bids state
  const [bids, setBids] = useState<Bid[]>([]);
  const [bidsLoading, setBidsLoading] = useState(true);
  const [bidsError, setBidsError] = useState<string | null>(null);
  const [showBidCaptureModal, setShowBidCaptureModal] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [tradeFilter, setTradeFilter] = useState<string>('');
  const [contractorFilter, setContractorFilter] = useState<string>('');

  useEffect(() => {
    if (activeTab === 'bid-rounds') {
      loadBidRounds();
    } else if (activeTab === 'templates') {
      loadTemplates();
    } else if (activeTab === 'bids') {
      loadBids();
    }
  }, [activeTab, statusFilter, tradeFilter, contractorFilter]);

  const loadBidRounds = async () => {
    try {
      console.log('[Bid Rounds] Starting to load...');
      setLoading(true);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('[Bid Rounds] Session error:', sessionError);
        throw new Error('Failed to get session');
      }

      if (!session) {
        console.log('[Bid Rounds] No session, redirecting to auth');
        router.push('/auth');
        return;
      }

      let url = '/api/bid-rounds?';
      if (statusFilter) url += `status=${statusFilter}&`;
      if (tradeFilter) url += `trade=${tradeFilter}&`;

      console.log('[Bid Rounds] Fetching from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      console.log('[Bid Rounds] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Bid Rounds] Response error:', errorText);
        throw new Error('Failed to load bid rounds');
      }

      const result = await response.json();
      console.log('[Bid Rounds] Loaded:', result.data?.length || 0, 'bid rounds');
      setBidRounds(result.data || []);
    } catch (err: unknown) {
      console.error('[Bid Rounds] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bid rounds');
    } finally {
      console.log('[Bid Rounds] Setting loading to false');
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        router.push('/auth');
        return;
      }

      const response = await fetch('/api/scope-templates', {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load scope templates');
      }

      const result = await response.json();
      setTemplates(result.data || []);
    } catch (err: unknown) {
      console.error('Error loading templates:', err);
      setTemplatesError(err instanceof Error ? err.message : 'Failed to load scope templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        router.push('/auth');
        return;
      }

      const response = await fetch(`/api/scope-templates/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      await loadTemplates();
    } catch (err: unknown) {
      console.error('Error deleting template:', err);
      setTemplatesError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const loadBids = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        router.push('/auth');
        return;
      }

      let url = '/api/bids?';
      if (statusFilter) url += `status=${statusFilter}&`;
      if (contractorFilter) url += `contractor_id=${contractorFilter}&`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load bids');
      }

      const result = await response.json();
      setBids(result.data || []);
    } catch (err: unknown) {
      console.error('Error loading bids:', err);
      setBidsError(err instanceof Error ? err.message : 'Failed to load bids');
    } finally {
      setBidsLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'photo':
        return '📷';
      case 'pdf':
        return '📄';
      case 'voice':
        return '🎤';
      default:
        return '✍️';
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; icon: React.ReactElement }> = {
      draft: {
        bg: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
        icon: <Clock className="w-3 h-3" />,
      },
      active: {
        bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        icon: <Users className="w-3 h-3" />,
      },
      awarded: {
        bg: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        icon: <CheckCircle className="w-3 h-3" />,
      },
      closed: {
        bg: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
        icon: <XCircle className="w-3 h-3" />,
      },
      cancelled: {
        bg: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        icon: <XCircle className="w-3 h-3" />,
      },
    };

    const style = styles[status] || styles.draft;

    return (
      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${style.bg}`}>
        {style.icon}
        {status}
      </span>
    );
  };

  const getBidStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      won: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      lost: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      declined: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      withdrawn: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    };

    return (
      <span className={`text-xs px-2 py-1 rounded-full ${styles[status] || styles.draft}`}>
        {status}
      </span>
    );
  };

  const getDaysUntilDeadline = (deadlineDate?: string) => {
    if (!deadlineDate) return null;
    const deadline = new Date(deadlineDate);
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeadlineText = (deadlineDate?: string) => {
    const daysUntil = getDaysUntilDeadline(deadlineDate);
    if (daysUntil === null) return 'No deadline';
    if (daysUntil < 0) return `${Math.abs(daysUntil)} days overdue`;
    if (daysUntil === 0) return 'Due today';
    if (daysUntil === 1) return 'Due tomorrow';
    return `Due in ${daysUntil} days`;
  };

  const getDeadlineColor = (deadlineDate?: string) => {
    const daysUntil = getDaysUntilDeadline(deadlineDate);
    if (daysUntil === null) return 'text-muted-foreground';
    if (daysUntil < 0) return 'text-red-600 dark:text-red-400';
    if (daysUntil <= 2) return 'text-orange-600 dark:text-orange-400';
    return 'text-muted-foreground';
  };

  // Only show loading for the active tab
  const isLoading =
    (activeTab === 'bid-rounds' && loading) ||
    (activeTab === 'templates' && templatesLoading) ||
    (activeTab === 'bids' && bidsLoading);

  if (isLoading) {
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

  return (
    <AppLayout>
      <PageContainer>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Bid Management</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeTab === 'bid-rounds'
                ? 'Manage competitive bidding rounds for projects'
                : activeTab === 'templates'
                ? 'Reusable scope checklists for bid rounds'
                : 'Track and manage all contractor bids'}
            </p>
          </div>
          {activeTab === 'bid-rounds' ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Bid Round
            </button>
          ) : activeTab === 'templates' ? (
            <button
              onClick={() => setShowTemplateCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Template
            </button>
          ) : (
            <button
              onClick={() => setShowBidCaptureModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Capture Bid
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab('bid-rounds')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'bid-rounds'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            Bid Rounds
          </button>
          <button
            onClick={() => setActiveTab('bids')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'bids'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            All Bids
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'templates'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            Templates
          </button>
        </div>

        {/* Bid Rounds Tab Content */}
        {activeTab === 'bid-rounds' && (
          <>
            {/* Filters */}
            <div className="bg-card border border-border rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Filter:</span>
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="awarded">Awarded</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select
                  value={tradeFilter}
                  onChange={(e) => setTradeFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="">All Trades</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="HVAC">HVAC</option>
                  <option value="Drywall">Drywall</option>
                  <option value="Painting">Painting</option>
                  <option value="Flooring">Flooring</option>
                  <option value="Roofing">Roofing</option>
                </select>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm mb-4">
                {error}
              </div>
            )}

            {/* Bid Rounds List */}
        {bidRounds.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No bid rounds yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Create a bid round to get competitive bids from multiple contractors.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create First Bid Round
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {bidRounds.map((round) => {
              const bidsArray = Array.isArray(round.bids) ? round.bids : [];
              const submittedCount = bidsArray.filter((b) => b.status === 'submitted').length;
              const totalCount = bidsArray.length;

              return (
                <div
                  key={round.id}
                  className="bg-card border border-border rounded-lg p-4 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => router.push(`/bid-rounds/${round.id}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-semibold text-foreground truncate">
                          {round.name}
                        </h3>
                        {getStatusBadge(round.status)}
                      </div>

                      <div className="flex items-center gap-6 text-sm mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Trade:</span>
                          <span className="font-medium text-foreground">{round.trade}</span>
                        </div>

                        {round.scope_type && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Type:</span>
                            <span className="text-foreground">{round.scope_type}</span>
                          </div>
                        )}

                        {round.project && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Project:</span>
                            <span className="text-foreground">{round.project.name}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground">
                            {submittedCount} of {totalCount} bids received
                          </span>
                        </div>

                        {round.deadline_date && (
                          <div className={`flex items-center gap-2 ${getDeadlineColor(round.deadline_date)}`}>
                            <Clock className="w-4 h-4" />
                            <span>{getDeadlineText(round.deadline_date)}</span>
                          </div>
                        )}

                        {round.winning_bid && (
                          <div className="text-green-600 dark:text-green-400 font-medium">
                            Won by {round.winning_bid.contractor?.name}
                          </div>
                        )}
                      </div>

                      {round.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {round.description}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-xs text-muted-foreground">Created</div>
                      <div className="text-sm text-foreground">{formatDate(round.created_at)}</div>
                    </div>
                  </div>

                  {/* Quick actions for active rounds */}
                  {round.status === 'active' && totalCount >= 2 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/bid-rounds/${round.id}/compare`);
                        }}
                        className="text-sm text-primary hover:underline font-medium"
                      >
                        Compare Bids →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
          </>
        )}

        {/* Templates Tab Content */}
        {activeTab === 'templates' && (
          <>
            {/* Error Display */}
            {templatesError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm mb-4">
                {templatesError}
              </div>
            )}

            {/* Templates List */}
            {templates.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No templates yet</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Create scope templates to streamline your bid rounds.
                </p>
                <button
                  onClick={() => setShowTemplateCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Create First Template
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(
                  templates.reduce((acc, template) => {
                    if (!acc[template.trade]) {
                      acc[template.trade] = [];
                    }
                    acc[template.trade].push(template);
                    return acc;
                  }, {} as Record<string, BidScopeTemplate[]>)
                ).map(([trade, tradeTemplates]) => (
                  <div key={trade}>
                    <h2 className="text-lg font-semibold text-foreground mb-3">{trade}</h2>
                    <div className="grid grid-cols-2 gap-4">
                      {tradeTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="bg-card border border-border rounded-lg p-4 hover:shadow-md hover:border-primary/50 transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground mb-1">{template.name}</h3>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{template.scope_type}</span>
                                {!template.is_active && (
                                  <span className="text-orange-600 dark:text-orange-400">
                                    (Inactive)
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => alert('Edit template functionality coming soon')}
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                                title="Edit template"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                title="Delete template"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {template.description && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {template.description}
                            </p>
                          )}

                          <div className="space-y-1.5">
                            <div className="text-xs text-muted-foreground font-medium mb-2">
                              Scope Items ({template.scope_items.length})
                            </div>
                            {template.scope_items.slice(0, 5).map((item, index) => (
                              <div key={index} className="flex items-start gap-2 text-sm">
                                <span className={item.typically_included ? 'text-green-600' : 'text-orange-600'}>
                                  {item.typically_included ? '✓' : '⚠'}
                                </span>
                                <span className="text-foreground">{item.item}</span>
                              </div>
                            ))}
                            {template.scope_items.length > 5 && (
                              <div className="text-xs text-muted-foreground pl-6">
                                +{template.scope_items.length - 5} more items...
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-3 border-t border-border">
                            <button
                              onClick={() => {
                                setActiveTab('bid-rounds');
                                setShowCreateModal(true);
                              }}
                              className="text-sm text-primary hover:underline font-medium"
                            >
                              Use This Template →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* All Bids Tab Content */}
        {activeTab === 'bids' && (
          <>
            {/* Filters */}
            <div className="bg-card border border-border rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Filter:</span>
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            </div>

            {/* Error Display */}
            {bidsError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm mb-4">
                {bidsError}
              </div>
            )}

            {/* Bids List */}
            {bids.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No bids yet</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Start capturing bids from contractors to track pricing and compare options.
                </p>
                <button
                  onClick={() => setShowBidCaptureModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Capture First Bid
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {bids.map((bid) => (
                  <div
                    key={bid.id}
                    className="bg-card border border-border rounded-lg p-4 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
                    onClick={() => router.push(`/bids/${bid.id}`)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-lg">{getSourceIcon(bid.source_type)}</span>
                          <h3 className="text-base font-semibold text-foreground truncate">
                            {bid.contractor?.name || 'Unknown Contractor'}
                          </h3>
                          {getBidStatusBadge(bid.status)}
                        </div>

                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold text-foreground">
                              {formatCurrency(bid.amount)}
                            </span>
                          </div>

                          {bid.project && (
                            <div className="text-muted-foreground">
                              Project: {bid.project.name}
                            </div>
                          )}

                          <div className="text-muted-foreground">
                            Created: {formatDate(bid.created_at)}
                          </div>

                          {bid.submitted_at && (
                            <div className="text-muted-foreground">
                              Submitted: {formatDate(bid.submitted_at)}
                            </div>
                          )}
                        </div>

                        {bid.notes && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {bid.notes}
                          </p>
                        )}
                      </div>

                      {bid.source_url && (
                        <div className="shrink-0">
                          <a
                            href={bid.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-primary hover:underline"
                          >
                            View Document
                          </a>
                        </div>
                      )}
                    </div>

                    {bid.variance_percent !== undefined && bid.variance_percent !== null && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">Actual Cost:</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(bid.actual_cost || 0)}
                          </span>
                          <span className={`font-medium ${
                            bid.variance_percent > 10 ? 'text-red-600' :
                            bid.variance_percent > 5 ? 'text-orange-600' :
                            'text-green-600'
                          }`}>
                            {bid.variance_percent > 0 ? '+' : ''}{bid.variance_percent.toFixed(1)}% variance
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Create Bid Round Modal */}
        <BidRoundCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(bidRoundId) => {
            setShowCreateModal(false);
            router.push(`/bid-rounds/${bidRoundId}`);
          }}
        />

        {/* Create Template Modal */}
        <ScopeTemplateCreateModal
          isOpen={showTemplateCreateModal}
          onClose={() => setShowTemplateCreateModal(false)}
          onSuccess={() => {
            setShowTemplateCreateModal(false);
            loadTemplates();
          }}
        />

        {/* Bid Capture Modal */}
        <BidCaptureModal
          isOpen={showBidCaptureModal}
          onClose={() => setShowBidCaptureModal(false)}
          onSuccess={loadBids}
        />
      </PageContainer>
    </AppLayout>
  );
}
