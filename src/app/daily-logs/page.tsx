"use client";

import { Suspense, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import DailyLogsView from '@/app/components/DailyLogsView';
import AppLayout from '@/app/components/AppLayout';
import LoadingAnimation from '@/app/components/LoadingAnimation';

// Force dynamic rendering since we rely on client-side auth
export const dynamic = 'force-dynamic';

function DailyLogsContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [searchQuery] = useState('');

  // Redirect to login if not authenticated
  if (!isLoading && !user) {
    router.replace('/');
    return <LoadingAnimation fullScreen />;
  }

  // Show loading state while auth is initializing
  if (isLoading) {
    return <LoadingAnimation fullScreen />;
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DailyLogsView searchQuery={searchQuery} />
        </div>
      </div>
    </AppLayout>
  );
}

export default function DailyLogsPage() {
  return (
    <Suspense fallback={<LoadingAnimation fullScreen />}>
      <DailyLogsContent />
    </Suspense>
  );
}
