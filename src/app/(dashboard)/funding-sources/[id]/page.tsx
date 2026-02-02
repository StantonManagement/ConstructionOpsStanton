'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFundingSource, useDeleteFundingSource } from '@/hooks/queries/useFundingSources';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Edit, Trash2, AlertTriangle, Calendar,
  Percent, FileText, DollarSign
} from 'lucide-react';

export default function FundingSourceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const fundingSourceId = params.id as string;

  const { data: fs, isLoading, error } = useFundingSource(fundingSourceId);
  const deleteMutation = useDeleteFundingSource();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(fundingSourceId);
      router.push('/funding-sources');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'loan': return 'bg-blue-100 text-blue-800';
      case 'grant': return 'bg-green-100 text-green-800';
      case 'equity': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-48 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !fs) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error?.message || 'Funding source not found'}
        </div>
      </div>
    );
  }

  const utilization = fs.commitment_amount
    ? Math.round((fs.drawn_amount / fs.commitment_amount) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/funding-sources')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Badge className={getTypeColor(fs.type)}>{fs.type}</Badge>
              <h1 className="text-2xl font-semibold text-gray-900">{fs.name}</h1>
              {!fs.is_active && <Badge variant="secondary">Inactive</Badge>}
            </div>
            {fs.lender_name && (
              <p className="text-gray-500">{fs.lender_name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push(`/funding-sources/${fundingSourceId}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="text-red-600 hover:bg-red-50"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-red-800">Delete this funding source?</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Link */}
      {fs.portfolio && (
        <Card
          className="cursor-pointer hover:border-blue-300 transition-colors"
          onClick={() => fs.portfolio?.id && router.push(`/portfolios/${fs.portfolio.id}`)}
        >
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Portfolio:</span>
                <span className="font-medium">{fs.portfolio?.name}</span>
                <span className="text-gray-400">({fs.portfolio?.code})</span>
              </div>
              <span className="text-blue-600 text-sm">View portfolio →</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Financial Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-500">Utilization</span>
              <span className="text-sm font-medium">{utilization}%</span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  utilization > 90 ? 'bg-orange-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, utilization)}%` }}
              />
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Commitment</p>
              <p className="text-2xl font-semibold">{formatCurrency(fs.commitment_amount)}</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Drawn</p>
              <p className="text-2xl font-semibold text-blue-700">{formatCurrency(fs.drawn_amount)}</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Remaining</p>
              <p className="text-2xl font-semibold text-green-700">{formatCurrency(fs.remaining || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            {fs.loan_number && (
              <>
                <dt className="text-sm text-gray-500 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Loan Number
                </dt>
                <dd className="text-sm font-medium">{fs.loan_number}</dd>
              </>
            )}

            {fs.interest_rate !== null && fs.interest_rate !== undefined && (
              <>
                <dt className="text-sm text-gray-500 flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Interest Rate
                </dt>
                <dd className="text-sm font-medium">{fs.interest_rate}%</dd>
              </>
            )}

            {fs.maturity_date && (
              <>
                <dt className="text-sm text-gray-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Maturity Date
                </dt>
                <dd className="text-sm font-medium">{formatDate(fs.maturity_date)}</dd>
              </>
            )}
          </dl>

          {fs.notes && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm text-gray-500 mb-2">Notes</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{fs.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => router.push(`/loan-draws/new?funding_source_id=${fs.id}`)}
          disabled={(fs.remaining || 0) <= 0}
        >
          <DollarSign className="w-4 h-4 mr-2" />
          Create Draw Request
        </Button>
        <Button variant="outline" onClick={() => router.push(`/loan-draws?funding_source_id=${fs.id}`)}>
          View Draw History
        </Button>
      </div>
    </div>
  );
}
