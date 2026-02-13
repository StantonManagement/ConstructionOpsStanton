'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AppLayout from '@/app/components/AppLayout';
import PageContainer from '@/app/components/PageContainer';
import {
  ArrowLeft,
  Edit2,
  Loader2,
  Calendar,
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  Plus,
  ArrowRight,
  UserPlus,
  MessageSquare,
} from 'lucide-react';
import { BidRound } from '@/types/bid';
import ContractorSelectionModal from '@/components/bid-rounds/ContractorSelectionModal';
import BidCaptureModal from '@/components/modals/BidCaptureModal';
import SendSMSInvitationsModal from '@/components/bid-rounds/SendSMSInvitationsModal';
import NotificationHistory from '@/components/bid-rounds/NotificationHistory';

export default function BidRoundDetailPage() {
  const router = useRouter();
  const params = useParams();
  const bidRoundId = params.id as string;

  const [bidRound, setBidRound] = useState<BidRound | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [awarding, setAwarding] = useState(false);
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [showBidCaptureModal, setShowBidCaptureModal] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);

  useEffect(() => {
    loadBidRound();
  }, [bidRoundId]);

  const loadBidRound = async () => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        router.push('/auth');
        return;
      }

      const response = await fetch(`/api/bid-rounds/${bidRoundId}`, {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Bid round not found');
        }
        throw new Error('Failed to load bid round');
      }

      const result = await response.json();
      setBidRound(result.data);
    } catch (err: unknown) {
      console.error('Error loading bid round:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bid round');
    } finally {
      setLoading(false);
    }
  };

  const handleAwardBid = async (bidId: number) => {
    if (!confirm('Award this bid? This will mark it as won and others as lost.')) {
      return;
    }

    try {
      setAwarding(true);
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        router.push('/auth');
        return;
      }

      const response = await fetch(`/api/bid-rounds/${bidRoundId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          winning_bid_id: bidId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to award bid');
      }

      await loadBidRound();
    } catch (err: unknown) {
      console.error('Error awarding bid:', err);
      setError(err instanceof Error ? err.message : 'Failed to award bid');
    } finally {
      setAwarding(false);
    }
  };

  const handleInviteContractors = async (contractorIds: number[]) => {
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        router.push('/auth');
        return;
      }

      const accessToken = session.data.session.access_token;

      // Create draft bids for each selected contractor
      const bidPromises = contractorIds.map(contractorId =>
        fetch('/api/bids', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            contractor_id: contractorId,
            bid_round_id: parseInt(bidRoundId),
            amount: 0, // Placeholder amount
            source_type: 'manual',
            status: 'draft',
          }),
        })
      );

      const responses = await Promise.all(bidPromises);
      const failedInvites = responses.filter(r => !r.ok);

      if (failedInvites.length > 0) {
        throw new Error(`Failed to invite ${failedInvites.length} contractor(s)`);
      }

      // Reload bid round to show new invitations
      await loadBidRound();
    } catch (err: unknown) {
      console.error('Error inviting contractors:', err);
      throw err; // Re-throw to be handled by modal
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

  if (error || !bidRound) {
    return (
      <AppLayout>
        <PageContainer>
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <XCircle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Error</h2>
            <p className="text-muted-foreground mb-6">{error || 'Bid round not found'}</p>
            <button
              onClick={() => router.push('/bid-rounds')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Back to Bid Rounds
            </button>
          </div>
        </PageContainer>
      </AppLayout>
    );
  }

  const bids = Array.isArray(bidRound.bids) ? bidRound.bids : [];
  const submittedBids = bids.filter((b) => b.status === 'submitted' || b.status === 'won' || b.status === 'lost');
  const lowestBid = submittedBids.length > 0
    ? Math.min(...submittedBids.map((b) => b.amount))
    : null;

  return (
    <AppLayout>
      <PageContainer>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/bid-rounds')}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-foreground">{bidRound.name}</h1>
                {getStatusBadge(bidRound.status)}
              </div>
              <p className="text-xs text-muted-foreground">
                {bidRound.trade} {bidRound.scope_type && `• ${bidRound.scope_type}`}
                {bidRound.project && ` • ${bidRound.project.name}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {bidRound.status !== 'awarded' && bidRound.status !== 'cancelled' && (
              <>
                <button
                  onClick={() => setShowContractorModal(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite Contractors
                </button>
                {bids.length > 0 && (
                  <button
                    onClick={() => setShowSMSModal(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Send SMS
                  </button>
                )}
              </>
            )}
            {submittedBids.length >= 2 && bidRound.status !== 'awarded' && (
              <button
                onClick={() => router.push(`/bid-rounds/${bidRoundId}/compare`)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Compare Bids
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs">Bids Received</span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {submittedBids.length}
                  <span className="text-sm text-muted-foreground font-normal ml-1">/ {bids.length}</span>
                </div>
              </div>

              {lowestBid !== null && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs">Lowest Bid</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(lowestBid)}
                  </div>
                </div>
              )}

              {bidRound.deadline_date && (
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs">Deadline</span>
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {formatDate(bidRound.deadline_date)}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {bidRound.description && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold text-foreground mb-3">Description</h2>
                <p className="text-sm text-foreground whitespace-pre-wrap">{bidRound.description}</p>
              </div>
            )}

            {/* Scope Items */}
            {bidRound.scope_items && bidRound.scope_items.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">Scope Items</h2>
                <div className="space-y-2">
                  {bidRound.scope_items.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 text-sm">
                      <span className={`mt-0.5 ${item.typically_included ? 'text-green-600' : 'text-orange-600'}`}>
                        {item.typically_included ? '✓' : '⚠'}
                      </span>
                      <div className="flex-1">
                        <div className="text-foreground">{item.item}</div>
                        {item.notes && (
                          <div className="text-muted-foreground text-xs mt-0.5">{item.notes}</div>
                        )}
                      </div>
                      {!item.typically_included && (
                        <span className="text-xs text-orange-600">Often excluded</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bids List */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Contractors & Bids</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {bids.filter(b => b.status === 'draft').length} invited • {submittedBids.length} submitted
                  </p>
                </div>
                <button
                  onClick={() => setShowBidCaptureModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                  Add Bid
                </button>
              </div>

              {bids.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No bids yet. Invite contractors or add bids manually.
                </div>
              ) : (
                <div className="space-y-3">
                  {bids.map((bid) => (
                    <div
                      key={bid.id}
                      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => router.push(`/bids/${bid.id}`)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-semibold text-foreground">
                            {bid.contractor?.name || 'Unknown Contractor'}
                          </span>
                          {getBidStatusBadge(bid.status)}
                          {bid.amount === lowestBid && lowestBid !== null && submittedBids.length > 1 && (
                            <span className="text-xs bg-green-500/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                              Lowest
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          {bid.status === 'draft' ? (
                            <div className="text-xs text-muted-foreground italic">
                              Invited - awaiting bid submission
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-muted-foreground" />
                                <span className="font-semibold text-foreground">
                                  {formatCurrency(bid.amount)}
                                </span>
                              </div>
                              {bid.submitted_at && (
                                <div className="text-muted-foreground text-xs">
                                  Submitted {formatDate(bid.submitted_at)}
                                </div>
                              )}
                              {bid.decline_reason && (
                                <div className="text-orange-600 dark:text-orange-400 text-xs">
                                  Declined: {bid.decline_reason.replace('_', ' ')}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {bidRound.status !== 'awarded' && bid.status === 'submitted' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAwardBid(bid.id);
                          }}
                          disabled={awarding}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          <Award className="w-4 h-4" />
                          Award
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notification History */}
            <NotificationHistory bidRoundId={parseInt(bidRoundId)} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Winner Info */}
            {bidRound.winning_bid && (
              <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-6">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-3">
                  <Award className="w-5 h-5" />
                  <h3 className="font-semibold">Awarded To</h3>
                </div>
                <div className="space-y-2">
                  <div className="text-lg font-bold text-green-900 dark:text-green-100">
                    {bidRound.winning_bid.contractor?.name}
                  </div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {formatCurrency(bidRound.winning_bid.amount)}
                  </div>
                  {bidRound.awarded_date && (
                    <div className="text-sm text-green-600 dark:text-green-400">
                      Awarded on {formatDate(bidRound.awarded_date)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Round Info */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Round Information</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Status</div>
                  <div>{getStatusBadge(bidRound.status)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Created</div>
                  <div className="text-sm text-foreground">{formatDate(bidRound.created_at)}</div>
                </div>
                {bidRound.deadline_date && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Deadline</div>
                    <div className="text-sm text-foreground">{formatDate(bidRound.deadline_date)}</div>
                  </div>
                )}
                {bidRound.scope_template && (
                  <div className="pt-2 border-t border-border">
                    <div className="text-xs text-muted-foreground mb-1">Template Used</div>
                    <div className="text-sm text-foreground">{bidRound.scope_template.name}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contractor Selection Modal */}
        <ContractorSelectionModal
          isOpen={showContractorModal}
          onClose={() => setShowContractorModal(false)}
          onInvite={handleInviteContractors}
          trade={bidRound.trade}
          bidRoundId={parseInt(bidRoundId)}
        />

        {/* Bid Capture Modal */}
        <BidCaptureModal
          isOpen={showBidCaptureModal}
          onClose={() => setShowBidCaptureModal(false)}
          onSuccess={loadBidRound}
          defaultBidRoundId={parseInt(bidRoundId)}
          defaultProjectId={bidRound.project_id || undefined}
        />

        {/* Send SMS Invitations Modal */}
        <SendSMSInvitationsModal
          isOpen={showSMSModal}
          onClose={() => setShowSMSModal(false)}
          bidRoundId={bidRoundId}
          bidRoundName={bidRound.name}
          onSuccess={loadBidRound}
        />
      </PageContainer>
    </AppLayout>
  );
}
