'use client';

import React, { Suspense, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  DollarSign,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  FileText,
  Building2
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { supabase } from '@/lib/supabaseClient';
import { formatCurrency } from '@/lib/theme';
import { usePortfolio } from '@/context/PortfolioContext';
import { GlobalFilterBar } from '@/components/GlobalFilterBar';

interface FundingSource {
  id: number;
  name: string;
  type: string;
  commitment_amount: number;
  drawn_amount: number;
  remaining: number;
  eligible_to_draw: number;
  lender_name?: string;
  interest_rate?: number;
  maturity_date?: string;
}

interface Portfolio {
  id: number;
  name: string;
  code: string;
  funding_sources: FundingSource[];
  totals: {
    commitment: number;
    drawn: number;
    remaining: number;
    eligible: number;
  };
}

interface CashPositionData {
  portfolios: Portfolio[];
}

function CashPositionContent() {
  const router = useRouter();
  const { selectedPortfolioId } = usePortfolio();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CashPositionData | null>(null);

  useEffect(() => {
    fetchCashPosition();
  }, []);

  const fetchCashPosition = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/cash-position', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cash position data');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      console.error('Error fetching cash position:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Filter portfolios based on selected portfolio
  const filteredPortfolios = useMemo(() => {
    if (!data?.portfolios) return [];

    if (selectedPortfolioId) {
      return data.portfolios.filter(p => p.id.toString() === selectedPortfolioId);
    }

    return data.portfolios;
  }, [data?.portfolios, selectedPortfolioId]);

  // Calculate global totals across all filtered portfolios
  const globalTotals = filteredPortfolios.reduce(
    (acc, portfolio) => ({
      commitment: acc.commitment + portfolio.totals.commitment,
      drawn: acc.drawn + portfolio.totals.drawn,
      remaining: acc.remaining + portfolio.totals.remaining,
      eligible: acc.eligible + portfolio.totals.eligible,
    }),
    { commitment: 0, drawn: 0, remaining: 0, eligible: 0 }
  ) || { commitment: 0, drawn: 0, remaining: 0, eligible: 0 };

  const utilizationRate = globalTotals.commitment > 0
    ? ((globalTotals.drawn / globalTotals.commitment) * 100).toFixed(1)
    : '0.0';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8">
            <p className="text-red-600 text-center">{error}</p>
            <div className="flex justify-center mt-4">
              <Button onClick={fetchCashPosition} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="p-0 hover:bg-transparent"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Wallet className="w-6 h-6 text-green-600" />
              Cash Position Dashboard
            </h1>
            <p className="text-gray-500 text-sm">Overview of available funding and cash position</p>
          </div>
        </div>
        <Button onClick={fetchCashPosition} variant="outline" size="sm">
          <Loader2 className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Global Filter Bar */}
      <GlobalFilterBar
        showPropertyFilter={true}
        showLocationFilter={false}
        showYearFilter={false}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Commitment */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Commitment</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(globalTotals.commitment)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Across all portfolios</p>
          </CardContent>
        </Card>

        {/* Total Drawn */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Drawn</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(globalTotals.drawn)}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">{utilizationRate}% utilization</p>
          </CardContent>
        </Card>

        {/* Available to Draw */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Available to Draw</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(globalTotals.remaining)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Remaining commitment</p>
          </CardContent>
        </Card>

        {/* Eligible to Draw */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Eligible to Draw</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {formatCurrency(globalTotals.eligible)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">From verified tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolios Breakdown */}
      {data?.portfolios && data.portfolios.length > 0 ? (
        <div className="space-y-6">
          {filteredPortfolios.map((portfolio) => (
            <Card key={portfolio.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{portfolio.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Code: {portfolio.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total Commitment</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(portfolio.totals.commitment)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Portfolio Summary Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500">Drawn</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {formatCurrency(portfolio.totals.drawn)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {portfolio.totals.commitment > 0
                        ? ((portfolio.totals.drawn / portfolio.totals.commitment) * 100).toFixed(1)
                        : '0'}% of commitment
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500">Remaining</p>
                    <p className="text-lg font-semibold text-green-600 mt-1">
                      {formatCurrency(portfolio.totals.remaining)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Available balance</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-xs text-gray-500">Eligible</p>
                    <p className="text-lg font-semibold text-purple-600 mt-1">
                      {formatCurrency(portfolio.totals.eligible)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Can be requested</p>
                  </div>
                </div>

                {/* Funding Sources Table */}
                {portfolio.funding_sources && portfolio.funding_sources.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-y border-gray-200">
                        <tr>
                          <th className="text-left p-3 font-medium text-gray-700">Funding Source</th>
                          <th className="text-left p-3 font-medium text-gray-700">Type</th>
                          <th className="text-right p-3 font-medium text-gray-700">Commitment</th>
                          <th className="text-right p-3 font-medium text-gray-700">Drawn</th>
                          <th className="text-right p-3 font-medium text-gray-700">Remaining</th>
                          <th className="text-right p-3 font-medium text-gray-700">Eligible</th>
                          <th className="text-center p-3 font-medium text-gray-700">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {portfolio.funding_sources.map((fs) => {
                          const utilization = fs.commitment_amount > 0
                            ? ((fs.drawn_amount / fs.commitment_amount) * 100).toFixed(0)
                            : '0';

                          return (
                            <tr key={fs.id} className="hover:bg-gray-50">
                              <td className="p-3">
                                <div>
                                  <p className="font-medium text-gray-900">{fs.name}</p>
                                  {fs.lender_name && (
                                    <p className="text-xs text-gray-500">{fs.lender_name}</p>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                  {fs.type}
                                </span>
                              </td>
                              <td className="p-3 text-right font-medium text-gray-900">
                                {formatCurrency(fs.commitment_amount)}
                              </td>
                              <td className="p-3 text-right text-gray-700">
                                {formatCurrency(fs.drawn_amount)}
                              </td>
                              <td className="p-3 text-right text-green-600 font-medium">
                                {formatCurrency(fs.remaining)}
                              </td>
                              <td className="p-3 text-right text-purple-600 font-medium">
                                {formatCurrency(fs.eligible_to_draw)}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${
                                        parseInt(utilization) > 80
                                          ? 'bg-orange-500'
                                          : parseInt(utilization) > 60
                                          ? 'bg-yellow-500'
                                          : 'bg-green-500'
                                      }`}
                                      style={{ width: `${utilization}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-600">{utilization}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Wallet className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Portfolios Found</h3>
            <p className="text-gray-500 max-w-sm mt-2">
              No active portfolios with funding sources are available.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CashPositionPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout>
      <Suspense fallback={<div className="p-8">Loading...</div>}>
        <CashPositionContent />
      </Suspense>
    </AppLayout>
  );
}
