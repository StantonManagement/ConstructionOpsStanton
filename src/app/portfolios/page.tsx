'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import LoadingAnimation from '../components/LoadingAnimation';
import AppLayout from '../components/AppLayout';
import PageContainer from '../components/PageContainer';
import { Briefcase, FolderOpen } from 'lucide-react';

export default function PortfoliosPage() {
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
      <Suspense fallback={<LoadingAnimation text="Loading portfolios..." />}>
        <PageContainer>
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-16">
              <div className="flex items-center justify-center gap-3 mb-6">
                <Briefcase className="w-16 h-16 text-muted-foreground" />
                <FolderOpen className="w-16 h-16 text-muted-foreground" />
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-4">Portfolios</h1>
              <p className="text-lg text-muted-foreground mb-8">
                Coming soon - Organize and manage project portfolios
              </p>
              <div className="bg-muted rounded-lg p-8 text-left max-w-2xl mx-auto">
                <h2 className="text-xl font-semibold text-foreground mb-4">Planned Features:</h2>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span>Group related projects into portfolios</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span>View portfolio-level budgets and timelines</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span>Track performance across multiple projects</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span>Generate portfolio reports and analytics</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span>Manage portfolio-level funding sources</span>
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
