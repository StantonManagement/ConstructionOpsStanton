'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { usePortfolio, useUpdatePortfolio } from '@/hooks/queries/usePortfolios';
import { PortfolioForm } from '@/components/PortfolioForm';

export default function EditPortfolioPage() {
  const router = useRouter();
  const params = useParams();
  const portfolioId = params.id as string;

  const { data: portfolio, isLoading } = usePortfolio(portfolioId);
  const updateMutation = useUpdatePortfolio();

  const handleSubmit = async (data: any) => {
    try {
      await updateMutation.mutateAsync({ id: portfolioId, ...data });
      router.push(`/portfolios/${portfolioId}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Portfolio</h1>
      <PortfolioForm
        initialData={portfolio}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/portfolios/${portfolioId}`)}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}
