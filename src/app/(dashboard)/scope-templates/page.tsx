'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AppLayout from '@/app/components/AppLayout';
import PageContainer from '@/app/components/PageContainer';

export default function ScopeTemplatesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to bid rounds page with templates tab
    router.push('/bid-rounds?tab=templates');
  }, [router]);

  return (
    <AppLayout>
      <PageContainer>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    </AppLayout>
  );
}
