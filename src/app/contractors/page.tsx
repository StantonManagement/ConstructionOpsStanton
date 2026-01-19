'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import ContractorsView from '../components/ContractorsView';
import LoadingAnimation from '../components/LoadingAnimation';
import AppLayout from '../components/AppLayout';

export default function ContractorsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <LoadingAnimation fullScreen />;
  }

  if (!user) {
    return <LoadingAnimation fullScreen />;
  }

  return (
    <AppLayout>
      <Suspense fallback={<LoadingAnimation text="Loading contractors..." />}>
        <ContractorsView searchQuery="" />
      </Suspense>
    </AppLayout>
  );
}
