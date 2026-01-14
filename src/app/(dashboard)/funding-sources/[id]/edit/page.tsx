'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFundingSource, useUpdateFundingSource } from '@/hooks/queries/useFundingSources';
import { FundingSourceForm } from '@/components/FundingSourceForm';

export default function EditFundingSourcePage() {
  const router = useRouter();
  const params = useParams();
  const fundingSourceId = params.id as string;

  const { data: fs, isLoading } = useFundingSource(fundingSourceId);
  const updateMutation = useUpdateFundingSource();

  const handleSubmit = async (data: any) => {
    try {
      await updateMutation.mutateAsync({ id: fundingSourceId, ...data });
      router.push(`/funding-sources/${fundingSourceId}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-96 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Edit Funding Source</h1>
      <FundingSourceForm
        initialData={fs}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/funding-sources/${fundingSourceId}`)}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}
