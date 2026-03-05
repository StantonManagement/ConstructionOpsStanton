'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import LoadingAnimation from '../components/LoadingAnimation';
import AppLayout from '../components/AppLayout';
import ActionItemsDashboard from '../components/ActionItemsDashboard';

export default function DashboardActionItemsPage() {
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
      <Suspense fallback={<LoadingAnimation text="Loading action items..." />}>
        <ActionItemsDashboard />
      </Suspense>
    </AppLayout>
  );
}
