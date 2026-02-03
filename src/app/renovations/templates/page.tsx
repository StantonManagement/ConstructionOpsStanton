'use client';

import { Suspense } from 'react';
import { TemplatesView } from '@/app/components/TemplatesView';
import AppLayout from '@/app/components/AppLayout';
import PageContainer from '@/app/components/PageContainer';
import { Loader2 } from 'lucide-react';

export default function TemplatesPage() {
  return (
    <AppLayout>
      <PageContainer>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        }>
          <TemplatesView />
        </Suspense>
      </PageContainer>
    </AppLayout>
  );
}
