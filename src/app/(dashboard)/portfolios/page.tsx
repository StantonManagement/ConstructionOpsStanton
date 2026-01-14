'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePortfolios } from '@/hooks/queries/usePortfolios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, DollarSign, FolderOpen, ChevronRight } from 'lucide-react';

export default function PortfoliosPage() {
  const router = useRouter();
  const [showInactive, setShowInactive] = useState(false);
  const { data: portfolios, isLoading, error } = usePortfolios({ activeOnly: !showInactive });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error loading portfolios: {error.message}
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Portfolios</h1>
          <p className="text-gray-500 mt-1">Manage your property portfolios and funding sources</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show inactive
          </label>
          <Button onClick={() => router.push('/portfolios/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New Portfolio
          </Button>
        </div>
      </div>

      {/* Portfolio Cards */}
      {portfolios?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No portfolios yet</h3>
            <p className="text-gray-500 mb-4">Create your first portfolio to start organizing projects and funding sources.</p>
            <Button onClick={() => router.push('/portfolios/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Portfolio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {portfolios?.map((portfolio) => (
            <Card
              key={portfolio.id}
              className="cursor-pointer hover:border-blue-300 transition-colors"
              onClick={() => router.push(`/portfolios/${portfolio.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{portfolio.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{portfolio.code}</p>
                  </div>
                  {!portfolio.is_active && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {portfolio.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{portfolio.description}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      <span className="font-medium">{portfolio.totals?.projects || 0}</span>
                      <span className="text-gray-500"> projects</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      <span className="font-medium">{portfolio.totals?.funding_sources || 0}</span>
                      <span className="text-gray-500"> sources</span>
                    </span>
                  </div>
                </div>

                {/* Funding Summary */}
                {(portfolio.totals?.commitment || 0) > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Commitment</span>
                      <span className="font-medium">{formatCurrency(portfolio.totals?.commitment || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Drawn</span>
                      <span className="font-medium">{formatCurrency(portfolio.totals?.drawn || 0)}</span>
                    </div>
                    <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${Math.min(100, ((portfolio.totals?.drawn || 0) / (portfolio.totals?.commitment || 1)) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Click indicator */}
                <div className="flex items-center justify-end text-blue-600 text-sm">
                  View details
                  <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
