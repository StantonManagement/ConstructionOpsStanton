'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCreateFundingSource } from '@/hooks/queries/useFundingSources';
import { FundingSourceForm } from '@/components/FundingSourceForm';

export default function NewFundingSourcePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPortfolioId = searchParams.get('portfolio_id');

  const createMutation = useCreateFundingSource();

  const handleSubmit = async (data: any) => {
    try {
      const fs = await createMutation.mutateAsync(data);
      router.push(`/funding-sources/${fs.id}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Add Funding Source</h1>
      <FundingSourceForm
        initialData={preselectedPortfolioId ? { portfolio_id: preselectedPortfolioId } : undefined}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
}
