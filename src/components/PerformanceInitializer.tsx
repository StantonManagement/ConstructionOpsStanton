'use client';

import { useEffect } from 'react';
import { trackWebVitals, observeQueryPerformance } from '@/lib/performance';

const PerformanceInitializer = () => {
  useEffect(() => {
    // Initialize performance tracking
    trackWebVitals();
    observeQueryPerformance();

    // Track initial page load
    if (typeof window !== 'undefined') {
      console.log('[Performance] App initialized');
    }
  }, []);

  return null; // This component doesn't render anything
};

export default PerformanceInitializer;