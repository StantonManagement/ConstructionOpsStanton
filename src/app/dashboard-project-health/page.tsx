'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import ProjectHealthDashboard from '@/app/components/ProjectHealthDashboard';
import LoadingAnimation from '@/app/components/LoadingAnimation';
import AppLayout from '@/app/components/AppLayout';

export default function DashboardProjectHealthPage() {
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
      <Suspense fallback={<LoadingAnimation text="Loading project health dashboard..." />}>
        <ProjectHealthDashboard />
      </Suspense>
    </AppLayout>
  );
}
