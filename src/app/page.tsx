"use client";

import { useAuth } from '@/providers/AuthProvider';
import { DataProvider, useData } from './context/DataContext';
import ConstructionDashboard from './components/ConstructionDashboard';
import PMDashboard from './components/PMDashboard';
import AuthScreen from './components/AuthScreen';
import { motion } from 'framer-motion';

// Animated loading component with Stanton branding
const ConstructionLoader = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-brand-navy-50 via-background to-brand-navy-100 relative overflow-hidden">
      {/* Animated background blobs */}
      <motion.div
        className="absolute top-20 left-10 w-72 h-72 bg-brand-navy-200 rounded-full mix-blend-multiply filter blur-xl opacity-30"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-96 h-96 bg-accent rounded-full mix-blend-multiply filter blur-xl opacity-20"
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -50, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <motion.div
        className="text-center relative z-10"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Animated logo */}
        <motion.div
          className="mx-auto h-24 w-24 bg-white border-4 border-brand-navy rounded-2xl flex items-center justify-center mb-6 shadow-2xl"
          animate={{
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <svg className="h-12 w-12 text-brand-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </motion.div>

        {/* Animated spinner */}
        <motion.div
          className="relative h-16 w-16 mx-auto mb-6"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <div className="absolute inset-0 rounded-full border-4 border-brand-navy-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-navy border-r-brand-navy"></div>
        </motion.div>

        {/* Loading text */}
        <motion.h2
          className="text-2xl font-bold text-brand-navy mb-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          Loading...
        </motion.h2>

        <motion.div className="flex items-center justify-center space-x-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-brand-navy-400 rounded-full"
              animate={{
                y: [0, -10, 0],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>
      </motion.div>
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

export default function Page() {
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
