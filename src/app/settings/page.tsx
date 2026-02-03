'use client';

import { Suspense } from 'react';
import SettingsView from '../components/SettingsView';
import { LoadingSpinner } from '../components/LoadingStates';
import AppLayout from '../components/AppLayout';
import PageContainer from '../components/PageContainer';

export default function SettingsPage() {
  return (
    <AppLayout>
      <PageContainer>
        <Suspense fallback={<LoadingSpinner size="lg" text="Loading settings..." className="py-20" />}>
          <SettingsView />
        </Suspense>
      </PageContainer>
    </AppLayout>
  );
}
