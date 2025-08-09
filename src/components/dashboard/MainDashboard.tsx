
'use client';

import React from 'react';
import { DataProvider } from '@/app/context/DataContext';
import ConstructionDashboard from '@/components/views/ConstructionDashboard';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

const MainDashboard: React.FC = () => {
  return (
    <ErrorBoundary>
      <DataProvider>
        <ConstructionDashboard />
      </DataProvider>
    </ErrorBoundary>
  );
};

export default MainDashboard;
