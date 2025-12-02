import { Suspense } from 'react';
import PMDashboard from '../components/PMDashboard';

// Force dynamic rendering since we rely on client-side search params and auth
export const dynamic = 'force-dynamic';

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
    </div>
  );
}

export default function PMDashboardPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PMDashboard />
    </Suspense>
  );
} 