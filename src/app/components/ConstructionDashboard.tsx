'use client';

import React, { memo, useCallback, Suspense, lazy } from 'react';
import { LoadingSpinner } from './LoadingStates';
import { Project } from '@/context/DataContext';
import { useRouter } from 'next/navigation';

// Lazy load components
const OverviewView = lazy(() => import('./OverviewView'));

const ConstructionDashboard: React.FC = () => {
  const router = useRouter();

  // Handle project selection and redirect to projects page
  const handleProjectSelect = useCallback((project: Project) => {
    router.push(`/projects?project=${project.id}`);
  }, [router]);

  // Handle switching to payments page
  const handleSwitchToPayments = useCallback(() => {
    router.push('/payments');
  }, [router]);



  return (
    <div className="p-6">
      <Suspense fallback={<LoadingSpinner size="lg" text="Loading..." className="py-20" />}>
        <OverviewView onProjectSelect={handleProjectSelect} onSwitchToPayments={handleSwitchToPayments} searchQuery="" />
      </Suspense>
    </div>
  );
};

export default memo(ConstructionDashboard); 