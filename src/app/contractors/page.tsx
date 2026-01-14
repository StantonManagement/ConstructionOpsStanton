'use client';

import { Suspense } from 'react';
import ContractorsView from '../components/ContractorsView';
import { LoadingSpinner } from '../components/LoadingStates';

export default function ContractorsPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" text="Loading contractors..." className="py-20" />}>
      <ContractorsView searchQuery="" />
    </Suspense>
  );
}
