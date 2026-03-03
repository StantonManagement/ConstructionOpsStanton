'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import LoadingAnimation from '../components/LoadingAnimation';
import AppLayout from '../components/AppLayout';
import PageContainer from '../components/PageContainer';
import { Gavel, Construction } from 'lucide-react';

export default function BidRoundsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <LoadingAnimation fullScreen />;
  }

  if (!user) {
    return <LoadingAnimation fullScreen />;
  }

  return (
    <AppLayout>
      <Suspense fallback={<LoadingAnimation text="Loading bid management..." />}>
        <PageContainer>
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-16">
              <div className="flex items-center justify-center gap-3 mb-6">
                <Gavel className="w-16 h-16 text-muted-foreground" />
                <Construction className="w-16 h-16 text-muted-foreground" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4">Bid Management</h1>
              <p className="text-lg text-muted-foreground mb-8">
                Coming soon - Manage bid rounds, invitations, and contractor responses
              </p>
              <div className="bg-muted rounded-lg p-8 text-left max-w-2xl mx-auto">
                <h2 className="text-xl font-semibold text-foreground mb-4">Planned Features:</h2>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span>Create and manage bid rounds for projects</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span>Send bid invitations to contractors</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span>Track bid responses and compare pricing</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span>Award bids and convert to contracts</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span>View bid history and analytics</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </PageContainer>
      </Suspense>
    </AppLayout>
  );
}
