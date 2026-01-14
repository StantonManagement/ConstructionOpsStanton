'use client';

import React from 'react';
import LocationDetailPage from '@/app/locations/[id]/page';

export default function ComponentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  return <LocationDetailPage params={unwrappedParams} />;
}
