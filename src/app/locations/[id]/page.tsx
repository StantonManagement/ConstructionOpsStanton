'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LocationRedirectPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const paramsCopy = new URLSearchParams(searchParams.toString());
    if (!paramsCopy.get('returnTo')) {
      paramsCopy.set('returnTo', '/renovations/locations');
    }

    const qs = paramsCopy.toString();
    router.replace(qs ? `/renovations/locations/${params.id}?${qs}` : `/renovations/locations/${params.id}`);
  }, [params.id, router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  );
}
