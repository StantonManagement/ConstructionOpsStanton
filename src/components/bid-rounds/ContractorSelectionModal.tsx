'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle, CheckCircle, Send, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface ContractorWithHistory {
  id: number;
  name: string;
  trade: string | null;
  phone: string | null;
  email: string | null;
  avg_bid_amount: number | null;
  bid_count: number;
  won_count: number;
  win_rate: number;
  avg_variance: number | null;
  last_bid_date: string | null;
  high_variance_warning: boolean;
}

interface ContractorSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (contractorIds: number[]) => Promise<void>;
  trade: string;
  bidRoundId: number;
}

export default function ContractorSelectionModal({
  isOpen,
  onClose,
  onInvite,
  trade,
  bidRoundId,
}: ContractorSelectionModalProps) {
  const [contractors, setContractors] = useState<ContractorWithHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadContractors();
    }
  }, [isOpen, trade]);

  const loadContractors = async () => {
    try {
      setLoading(true);
      setError(null);

      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/contractors/with-history?trade=${encodeURIComponent(trade)}`, {
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load contractors');
      }

      const result = await response.json();
      setContractors(result.data || []);
    } catch (err: unknown) {
      console.error('Error loading contractors:', err);
      setError(err instanceof Error ? err.message : 'Failed to load contractors');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleContractor = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === contractors.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contractors.map(c => c.id)));
    }
  };

  const handleInvite = async () => {
    if (selectedIds.size === 0) return;

    try {
      setInviting(true);
      await onInvite(Array.from(selectedIds));
      setSelectedIds(new Set());
      onClose();
    } catch (err) {
      console.error('Error inviting contractors:', err);
      setError(err instanceof Error ? err.message : 'Failed to invite contractors');
    } finally {
      setInviting(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">Invite Contractors</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select contractors to invite for {trade} work
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          ) : contractors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No contractors found for {trade}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All */}
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <input
                  type="checkbox"
                  checked={selectedIds.size === contractors.length && contractors.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm font-medium text-foreground">
                  Select All ({selectedIds.size} of {contractors.length} selected)
                </span>
              </div>

              {/* Contractors Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border">
                    <tr className="text-left">
                      <th className="pb-3 pr-4"></th>
                      <th className="pb-3 pr-4 text-sm font-semibold text-foreground">Contractor</th>
                      <th className="pb-3 pr-4 text-sm font-semibold text-foreground">Contact</th>
                      <th className="pb-3 pr-4 text-sm font-semibold text-foreground text-right">Avg Bid</th>
                      <th className="pb-3 pr-4 text-sm font-semibold text-foreground text-center">Bids</th>
                      <th className="pb-3 pr-4 text-sm font-semibold text-foreground text-center">Win Rate</th>
                      <th className="pb-3 pr-4 text-sm font-semibold text-foreground text-center">CO Variance</th>
                      <th className="pb-3 text-sm font-semibold text-foreground">Last Bid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {contractors.map((contractor) => (
                      <tr
                        key={contractor.id}
                        className={`hover:bg-accent transition-colors ${
                          selectedIds.has(contractor.id) ? 'bg-primary/5' : ''
                        }`}
                      >
                        <td className="py-3 pr-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(contractor.id)}
                            onChange={() => handleToggleContractor(contractor.id)}
                            className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
                          />
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-start gap-2">
                            {contractor.high_variance_warning && (
                              <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                            )}
                            <div>
                              <div className="font-medium text-foreground">{contractor.name}</div>
                              {contractor.trade && (
                                <div className="text-xs text-muted-foreground">{contractor.trade}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="text-sm">
                            {contractor.phone && (
                              <div className="text-foreground">{contractor.phone}</div>
                            )}
                            {contractor.email && (
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {contractor.email}
                              </div>
                            )}
                            {!contractor.phone && !contractor.email && (
                              <span className="text-xs text-muted-foreground">No contact</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <DollarSign className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm font-semibold text-foreground">
                              {contractor.avg_bid_amount !== null
                                ? formatCurrency(contractor.avg_bid_amount).replace('$', '')
                                : 'N/A'}
                            </span>
                          </div>
                          {contractor.bid_count > 0 && (
                            <div className="text-xs text-muted-foreground">
                              from {contractor.bid_count} bid{contractor.bid_count !== 1 ? 's' : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-center">
                          <span className="text-sm text-foreground">{contractor.bid_count}</span>
                        </td>
                        <td className="py-3 pr-4 text-center">
                          {contractor.bid_count > 0 ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-sm font-medium text-foreground">
                                {contractor.win_rate.toFixed(0)}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {contractor.won_count} won
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-center">
                          {contractor.avg_variance !== null ? (
                            <div className="flex items-center justify-center gap-1">
                              <TrendingUp
                                className={`w-3 h-3 ${
                                  contractor.avg_variance > 10
                                    ? 'text-red-500'
                                    : contractor.avg_variance > 5
                                    ? 'text-orange-500'
                                    : 'text-green-500'
                                }`}
                              />
                              <span
                                className={`text-sm font-medium ${
                                  contractor.avg_variance > 10
                                    ? 'text-red-600 dark:text-red-400'
                                    : contractor.avg_variance > 5
                                    ? 'text-orange-600 dark:text-orange-400'
                                    : 'text-green-600 dark:text-green-400'
                                }`}
                              >
                                {contractor.avg_variance > 0 ? '+' : ''}
                                {contractor.avg_variance.toFixed(1)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {formatDate(contractor.last_bid_date)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 text-xs text-muted-foreground pt-3 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-orange-500" />
                  <span>High variance contractor (&gt;10%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Low variance (&lt;5%)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <div className="text-sm text-muted-foreground">
            {selectedIds.size > 0 ? (
              <span>
                {selectedIds.size} contractor{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
            ) : (
              <span>No contractors selected</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-accent transition-colors"
              disabled={inviting}
            >
              Cancel
            </button>
            <button
              onClick={handleInvite}
              disabled={selectedIds.size === 0 || inviting}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inviting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Inviting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Invite Selected
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
