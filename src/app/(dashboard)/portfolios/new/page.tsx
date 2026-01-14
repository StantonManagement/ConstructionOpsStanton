'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCreatePortfolio } from '@/hooks/queries/usePortfolios';
import { PortfolioForm } from '@/components/PortfolioForm';

export default function NewPortfolioPage() {
  const router = useRouter();
  const createMutation = useCreatePortfolio();

  const handleSubmit = async (data: any) => {
    try {
      const portfolio = await createMutation.mutateAsync(data);
      router.push(`/portfolios/${portfolio.id}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Create Portfolio</h1>
      <PortfolioForm
        onSubmit={handleSubmit}
        onCancel={() => router.push('/portfolios')}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}
