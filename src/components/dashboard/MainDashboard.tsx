
'use client';

import React from 'react';
import { DataProvider } from '@/app/context/DataContext';
import ConstructionDashboard from '@/components/views/ConstructionDashboard';

const MainDashboard: React.FC = () => {
  return (
    <DataProvider>
      <ConstructionDashboard />
    </DataProvider>
  );
};

export default MainDashboard;
