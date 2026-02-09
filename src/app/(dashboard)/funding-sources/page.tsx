'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function FundingSourcesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to cash position page - funding sources are now integrated there
    router.replace('/cash-position');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}
