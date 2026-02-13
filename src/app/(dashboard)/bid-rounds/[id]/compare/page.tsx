'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AppLayout from '@/app/components/AppLayout';
import PageContainer from '@/app/components/PageContainer';
import {
  ArrowLeft,
  Loader2,
  DollarSign,
  CheckCircle,
  XCircle,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { BidRound, Bid } from '@/types/bid';

export default function CompareBidsPage() {
  const router = useRouter();
  const params = useParams();
  const bidRoundId = params.id as string;

  const [bidRound, setBidRound] = useState<BidRound | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [awarding, setAwarding] = useState(false);

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

      router.push(`/bid-rounds/${bidRoundId}`);
    } catch (err: unknown) {
      console.error('Error awarding bid:', err);
      setError(err instanceof Error ? err.message : 'Failed to award bid');
    } finally {
      setAwarding(false);
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

  const getScopeItemStatus = (bid: Bid, itemName: string) => {
    if (!bid.scope_coverage || bid.scope_coverage.length === 0) {
      return { included: null, notes: null, addCost: null };
    }

    const scopeItem = bid.scope_coverage.find((item) => item.item === itemName);
    if (!scopeItem) {
      return { included: null, notes: null, addCost: null };
    }

    return {
      included: scopeItem.included,
      notes: scopeItem.notes,
      addCost: scopeItem.add_cost,
    };
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

  if (submittedBids.length === 0) {
    return (
      <AppLayout>
        <PageContainer>
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push(`/bid-rounds/${bidRoundId}`)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Compare Bids</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{bidRound.name}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-orange-500 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Not enough bids to compare</h3>
            <p className="text-sm text-muted-foreground mb-6">
              You need at least one submitted bid to use the comparison view.
            </p>
            <button
              onClick={() => router.push(`/bid-rounds/${bidRoundId}`)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Back to Bid Round
            </button>
          </div>
        </PageContainer>
      </AppLayout>
    );
  }

  const lowestBid = Math.min(...submittedBids.map((b) => b.amount));
  const scopeItems = bidRound.scope_items || [];

  return (
    <AppLayout>
      <PageContainer>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push(`/bid-rounds/${bidRoundId}`)}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Compare Bids</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{bidRound.name}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Comparison Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground sticky left-0 bg-muted z-10">
                    Item
                  </th>
                  {submittedBids.map((bid) => (
                    <th key={bid.id} className="px-4 py-3 text-center text-sm font-semibold text-foreground min-w-[200px]">
                      <div className="flex flex-col items-center gap-1">
                        <span>{bid.contractor?.name || 'Unknown'}</span>
                        {bid.contractor?.trade && (
                          <span className="text-xs text-muted-foreground font-normal">
                            {bid.contractor.trade}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* Total Amount Row */}
                <tr className="bg-muted/50">
                  <td className="px-4 py-4 font-semibold text-foreground sticky left-0 bg-muted/50 z-10">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Total Bid Amount
                    </div>
                  </td>
                  {submittedBids.map((bid) => (
                    <td key={bid.id} className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className={`text-xl font-bold ${bid.amount === lowestBid ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                          {formatCurrency(bid.amount)}
                        </span>
                        {bid.amount === lowestBid && (
                          <span className="text-xs bg-green-500/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                            Lowest
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Scope Items */}
                {scopeItems.length > 0 && (
                  <>
                    <tr className="bg-muted/30">
                      <td colSpan={submittedBids.length + 1} className="px-4 py-2 text-sm font-semibold text-foreground">
                        Scope Coverage
                      </td>
                    </tr>
                    {scopeItems.map((scopeItem, index) => {
                      const hasExclusions = submittedBids.some(bid => {
                        const status = getScopeItemStatus(bid, scopeItem.item);
                        return status.included === false;
                      });

                      return (
                        <tr key={index} className={hasExclusions ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}>
                          <td className="px-4 py-3 text-sm text-foreground sticky left-0 bg-inherit z-10">
                            <div className="flex items-start gap-2">
                              {hasExclusions && (
                                <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                              )}
                              <div>
                                <div>{scopeItem.item}</div>
                                {scopeItem.notes && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {scopeItem.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          {submittedBids.map((bid) => {
                            const status = getScopeItemStatus(bid, scopeItem.item);
                            return (
                              <td key={bid.id} className="px-4 py-3 text-center">
                                {status.included === true ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    <span className="text-xs text-green-600 dark:text-green-400">Included</span>
                                    {status.notes && (
                                      <span className="text-xs text-muted-foreground">{status.notes}</span>
                                    )}
                                  </div>
                                ) : status.included === false ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    <span className="text-xs text-red-600 dark:text-red-400">Excluded</span>
                                    {status.addCost !== undefined && status.addCost > 0 && (
                                      <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                        +{formatCurrency(status.addCost)}
                                      </span>
                                    )}
                                    {status.notes && (
                                      <span className="text-xs text-muted-foreground">{status.notes}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Not specified</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </>
                )}

                {/* Notes Row */}
                <tr className="bg-muted/30">
                  <td className="px-4 py-3 font-semibold text-sm text-foreground sticky left-0 bg-muted/30 z-10">
                    Notes
                  </td>
                  {submittedBids.map((bid) => (
                    <td key={bid.id} className="px-4 py-3 text-center">
                      {bid.notes ? (
                        <div className="text-xs text-muted-foreground text-left max-w-xs">
                          {bid.notes}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No notes</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Historical Performance */}
                {submittedBids.some(bid => bid.variance_percent !== undefined && bid.variance_percent !== null) && (
                  <tr>
                    <td className="px-4 py-3 font-semibold text-sm text-foreground sticky left-0 bg-card z-10">
                      Historical Variance
                    </td>
                    {submittedBids.map((bid) => (
                      <td key={bid.id} className="px-4 py-3 text-center">
                        {bid.variance_percent !== undefined && bid.variance_percent !== null ? (
                          <div className={`text-sm font-semibold ${
                            bid.variance_percent > 10 ? 'text-red-600' :
                            bid.variance_percent > 5 ? 'text-orange-600' :
                            'text-green-600'
                          }`}>
                            {bid.variance_percent > 0 ? '+' : ''}{bid.variance_percent.toFixed(1)}%
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </td>
                    ))}
                  </tr>
                )}

                {/* Actions Row */}
                {bidRound.status !== 'awarded' && (
                  <tr className="bg-muted/50">
                    <td className="px-4 py-4 font-semibold text-sm text-foreground sticky left-0 bg-muted/50 z-10">
                      Action
                    </td>
                    {submittedBids.map((bid) => (
                      <td key={bid.id} className="px-4 py-4 text-center">
                        {bid.status === 'submitted' && (
                          <button
                            onClick={() => handleAwardBid(bid.id)}
                            disabled={awarding}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            <Award className="w-4 h-4" />
                            Award This Bid
                          </button>
                        )}
                        {bid.status === 'won' && (
                          <div className="inline-flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                            <CheckCircle className="w-4 h-4" />
                            Winner
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-start gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Included in bid</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <span>Excluded from bid</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span>Item has exclusions - review carefully</span>
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  );
}
