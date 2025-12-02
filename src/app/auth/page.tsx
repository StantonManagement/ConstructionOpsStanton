import AuthScreen from '@/app/components/AuthScreen';
import { Suspense } from 'react';

// Force dynamic rendering since we depend on client-side auth state
export const dynamic = 'force-dynamic';

export default function AuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthScreen />
    </Suspense>
  );
}