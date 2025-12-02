"use client";

import { Suspense } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { DataProvider, useData } from './context/DataContext';
import ConstructionDashboard from './components/ConstructionDashboard';
import PMDashboard from './components/PMDashboard';
import AuthScreen from './components/AuthScreen';

// Force dynamic rendering since we rely on client-side search params and auth
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

// Simple loading component
const ConstructionLoader = () => {

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800">Loading...</h2>
      </div>
    </div>
  );
};

// Component that waits for DataContext to load
const DashboardWithLoading = () => {
  const { loading, error, refreshData } = useData();

  if (loading) {
    return <ConstructionLoader />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-900 mb-2">
              Data Loading Error
            </h2>
            <p className="text-sm text-red-700 mb-4">
              {error}
            </p>
            <div className="text-xs text-red-600 bg-red-100 p-3 rounded mb-4 text-left font-mono">
              Check the browser console (F12) for detailed error information.
            </div>
          </div>
          <button
            onClick={() => refreshData()}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            Retry Loading Data
          </button>
          <div className="mt-4 text-sm text-gray-600">
            <p>Common issues:</p>
            <ul className="text-left mt-2 space-y-1">
              <li>• Database tables may not exist</li>
              <li>• RLS policies may be blocking access</li>
              <li>• Network connection issues</li>
              <li>• Invalid Supabase configuration</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return <ConstructionDashboard />;
};

function PageContent() {
  const { user, role, isLoading, error } = useAuth();

  // Show loading state while auth is initializing
  if (isLoading) {
    return <ConstructionLoader />;
  }

  // Show auth error if something went wrong
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-red-600 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-red-900 mb-2">
              Authentication Error
            </h2>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return <AuthScreen />;
  }

  // Route to appropriate dashboard based on role
  if (role === "pm") {
    return <PMDashboard />;
  }

  // Admin/Staff dashboard (wrapped in DataProvider for now, will migrate later)
  return (
    <DataProvider>
      <DashboardWithLoading />
    </DataProvider>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<ConstructionLoader />}>
      <PageContent />
    </Suspense>
  );
}
