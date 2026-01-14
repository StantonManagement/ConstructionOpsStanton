'use client';

import { Suspense } from 'react';
import PaymentsView from '../components/PaymentsView';
import { LoadingSpinner } from '../components/LoadingStates';

export default function PaymentsPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" text="Loading payments..." className="py-20" />}>
      <PaymentsView searchQuery="" />
    </Suspense>
  );
}
