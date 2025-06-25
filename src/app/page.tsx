"use client";

import { DataProvider } from './context/DataContext';
import ConstructionDashboard from './components/ConstructionDashboard';

export default function Page() {
  return (
    <DataProvider>
      <ConstructionDashboard />
    </DataProvider>
  );
}
