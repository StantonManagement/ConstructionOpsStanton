'use client';

import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageContainer - Reusable container component for consistent page layout
 * Provides uniform padding and spacing across all pages
 */
export default function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden ${className}`}>
      {children}
    </div>
  );
}
