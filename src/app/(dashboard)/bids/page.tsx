'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import AppLayout from '@/app/components/AppLayout';
import PageContainer from '@/app/components/PageContainer';
import { Plus, FileText, DollarSign, Loader2, Filter } from 'lucide-react';
import { Bid } from '@/types/bid';

export default function BidsPage() {
  const router = useRouter();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [contractorFilter, setContractorFilter] = useState<string>('');

  useEffect(() => {
    loadBids();
  }, [statusFilter, contractorFilter]);

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
          'Authorization': `Bearer ${session.data.session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load bids');
      }

      const data = await response.json();
      setBids(data);
    } catch (err: any) {
      console.error('Error loading bids:', err);
      setError(err.message || 'Failed to load bids');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
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
      <span className={`text-xs px-2 py-1 rounded-full ${styles[status] || styles.draft}`}>
        {status}
      </span>
    );
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

  return (
    <AppLayout>
      <PageContainer>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Bids</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track and manage contractor bids
            </p>
          </div>
          <button
            onClick={() => router.push('/bids/new')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Capture Bid
          </button>
        </div>

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
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm mb-4">
            {error}
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
              onClick={() => router.push('/bids/new')}
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
                      {getStatusBadge(bid.status)}
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
      </PageContainer>
    </AppLayout>
  );
}
