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
    <div className={`p-6 space-y-6 ${className}`}>
      {children}
    </div>
  );
}
