"use client";

import { useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import AuthScreen from './components/AuthScreen';
import LoadingAnimation from './components/LoadingAnimation';

// Force dynamic rendering since we rely on client-side auth
export const dynamic = 'force-dynamic';

export default function Page() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  // Show loading state while auth is initializing
  if (isLoading) {
    return <LoadingAnimation fullScreen />;
  }

  // Show auth screen if not authenticated
  if (!user) {
    return <AuthScreen />;
  }

  // Show loader while redirecting
  return <LoadingAnimation fullScreen />;
}
