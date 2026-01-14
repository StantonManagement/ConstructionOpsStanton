'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { usePortfolio, useUpdatePortfolio, useDeletePortfolio } from '@/hooks/queries/usePortfolios';
import { useFundingSources } from '@/hooks/queries/useFundingSources';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Edit, Trash2, Plus, Building2, DollarSign,
  AlertTriangle, ChevronRight
} from 'lucide-react';

export default function PortfolioDetailPage() {
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
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-40 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error?.message || 'Portfolio not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/portfolios')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-gray-900">{portfolio.name}</h1>
              {!portfolio.is_active && <Badge variant="secondary">Inactive</Badge>}
            </div>
            <p className="text-gray-500">{portfolio.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push(`/portfolios/${portfolioId}/edit`)}>
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
                <span className="text-red-800">Are you sure you want to delete this portfolio?</span>
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

      {/* Description */}
      {portfolio.description && (
        <Card>
          <CardContent className="py-4">
            <p className="text-gray-600">{portfolio.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Funding Sources Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Funding Sources</h2>
          <Button onClick={() => router.push(`/funding-sources/new?portfolio_id=${portfolioId}`)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Funding Source
          </Button>
        </div>

        {fundingSources?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <DollarSign className="w-10 h-10 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 mb-4">No funding sources yet</p>
              <Button
                variant="outline"
                onClick={() => router.push(`/funding-sources/new?portfolio_id=${portfolioId}`)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Funding Source
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {fundingSources?.map((fs) => (
              <Card
                key={fs.id}
                className="cursor-pointer hover:border-blue-300 transition-colors"
                onClick={() => router.push(`/funding-sources/${fs.id}`)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={getTypeColor(fs.type)}>{fs.type}</Badge>
                      <div>
                        <p className="font-medium">{fs.name}</p>
                        {fs.lender_name && (
                          <p className="text-sm text-gray-500">{fs.lender_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Commitment</p>
                        <p className="font-medium">{formatCurrency(fs.commitment_amount)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Remaining</p>
                        <p className="font-medium">{formatCurrency(fs.remaining || 0)}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Projects Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Projects</h2>
          <Button variant="outline" onClick={() => router.push('/projects')}>
            Manage Projects
          </Button>
        </div>

        {portfolio.projects?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Building2 className="w-10 h-10 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">No projects assigned to this portfolio</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {portfolio.projects?.map((project: any) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:border-blue-300 transition-colors"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{project.name}</p>
                      {project.address && (
                        <p className="text-sm text-gray-500">{project.address}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {project.status && (
                        <Badge variant="outline">{project.status}</Badge>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
