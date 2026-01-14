'use client';

import { Suspense } from 'react';
import SettingsView from '../components/SettingsView';
import { LoadingSpinner } from '../components/LoadingStates';

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingSpinner size="lg" text="Loading settings..." className="py-20" />}>
      <SettingsView />
    </Suspense>
  );
}
