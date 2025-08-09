'use client';

import React from 'react';
import { DataProvider } from '@/app/context/DataContext';
import ConstructionDashboard from '@/components/views/ConstructionDashboard';
import ErrorBoundary from '@/components/shared/ui/ErrorBoundary';

const MainDashboard: React.FC = () => {
  return (
    <DataProvider>
      <ErrorBoundary>
        <ConstructionDashboard />
      </ErrorBoundary>
    </DataProvider>
  );
};

export default MainDashboard;