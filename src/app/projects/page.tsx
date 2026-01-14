'use client';

import { Suspense } from 'react';
import ProjectsView from '../components/ProjectsView';
import { LoadingSpinner } from '../components/LoadingStates';

export default function ProjectsPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" text="Loading projects..." className="py-20" />}>
      <ProjectsView searchQuery="" />
    </Suspense>
  );
}
