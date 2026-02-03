'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { usePortfolio, useUpdatePortfolio, useDeletePortfolio } from '@/hooks/queries/usePortfolios';
import { useFundingSources } from '@/hooks/queries/useFundingSources';
import {
  ArrowLeft, Edit, Trash2, Plus, Building2, DollarSign,
  AlertTriangle, ChevronRight, Loader2
} from 'lucide-react';
import AppLayout from '@/app/components/AppLayout';
import PageContainer from '@/app/components/PageContainer';

function PortfolioDetailContent() {
  const router = useRouter();
  const params = useParams();
  const portfolioId = params.id as string;

  const { data: portfolio, isLoading, error } = usePortfolio(portfolioId);
  const { data: fundingSources } = useFundingSources({ portfolioId });
  const updateMutation = useUpdatePortfolio();
  const deleteMutation = useDeletePortfolio();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(portfolioId);
      router.push('/portfolios');
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
      <AppLayout>
        <PageContainer>
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-gray-200 rounded w-48" />
            <div className="h-32 bg-gray-200 rounded-lg" />
            <div className="h-32 bg-gray-200 rounded-lg" />
          </div>
        </PageContainer>
      </AppLayout>
    );
  }

  if (error || !portfolio) {
    return (
      <AppLayout>
        <PageContainer>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error?.message || 'Portfolio not found'}
          </div>
        </PageContainer>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageContainer>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/portfolios')}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Back
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{portfolio.name}</h1>
                {!portfolio.is_active && (
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{portfolio.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/portfolios/${portfolioId}/edit`)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              <Edit className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        </div>

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-xs text-red-800">Delete this portfolio?</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {portfolio.description && (
          <div className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
            <p className="text-xs text-gray-600">{portfolio.description}</p>
          </div>
        )}

        {/* Funding Sources Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-900">Funding Sources</h2>
            <button
              onClick={() => router.push(`/funding-sources/new?portfolio_id=${portfolioId}`)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>

          {fundingSources?.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
              <DollarSign className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-500 mb-3">No funding sources yet</p>
              <button
                onClick={() => router.push(`/funding-sources/new?portfolio_id=${portfolioId}`)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add First Source
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {fundingSources?.map((fs) => (
                <div
                  key={fs.id}
                  className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
                  onClick={() => router.push(`/funding-sources/${fs.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${getTypeColor(fs.type)}`}>
                        {fs.type}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-gray-900 truncate">{fs.name}</p>
                        {fs.lender_name && (
                          <p className="text-xs text-gray-500 truncate">{fs.lender_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500">Commitment</p>
                        <p className="text-xs font-semibold text-gray-900">{formatCurrency(fs.commitment_amount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500">Remaining</p>
                        <p className="text-xs font-semibold text-gray-900">{formatCurrency(fs.remaining || 0)}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Projects Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-gray-900">Projects</h2>
            <button
              onClick={() => router.push('/projects')}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Manage Projects
            </button>
          </div>

          {portfolio.projects?.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
              <Building2 className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-500">No projects assigned to this portfolio</p>
            </div>
          ) : (
            <div className="space-y-2">
              {portfolio.projects?.map((project: any) => (
                <div
                  key={project.id}
                  className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{project.name}</p>
                      {project.address && (
                        <p className="text-xs text-gray-500 truncate">{project.address}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {project.status && (
                        <span className="text-[10px] px-1.5 py-0.5 border border-gray-300 rounded text-gray-700">
                          {project.status}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </AppLayout>
  );
}

export default function PortfolioDetailPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <PageContainer>
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </PageContainer>
      </AppLayout>
    }>
      <PortfolioDetailContent />
    </Suspense>
  );
}
