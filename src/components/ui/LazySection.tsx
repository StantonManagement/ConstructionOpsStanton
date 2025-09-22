'use client';

import React, { useState, useRef, useEffect } from 'react';
import { LoadingSpinner, LoadingSkeleton } from '../../app/components/LoadingStates';

interface LazySectionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  delay?: number;
  className?: string;
  id?: string;
  minHeight?: string;
}

export const LazySection: React.FC<LazySectionProps> = ({
  children,
  fallback,
  threshold = 0.1,
  rootMargin = '100px',
  delay = 0,
  className = '',
  id,
  minHeight = '200px'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentRef = ref.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);

          if (delay > 0) {
            setTimeout(() => setShouldRender(true), delay);
          } else {
            setShouldRender(true);
          }

          observer.unobserve(currentRef);
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(currentRef);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold, rootMargin, delay]);

  const defaultFallback = (
    <div className="animate-pulse space-y-4 p-4">
      <LoadingSkeleton lines={3} />
    </div>
  );

  return (
    <div
      ref={ref}
      className={className}
      id={id}
      style={{ minHeight: !shouldRender ? minHeight : undefined }}
    >
      {shouldRender ? children : (fallback || defaultFallback)}
    </div>
  );
};

// Pre-built lazy components for common use cases
export const LazyChart: React.FC<{
  children: React.ReactNode;
  title?: string;
  className?: string;
}> = ({ children, title, className = '' }) => (
  <LazySection
    className={className}
    fallback={
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="space-y-4">
          {title && <div className="h-6 bg-gray-200 rounded w-1/3"></div>}
          <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
            <LoadingSpinner text="Loading chart..." />
          </div>
        </div>
      </div>
    }
    threshold={0.2}
    rootMargin="50px"
  >
    {children}
  </LazySection>
);

export const LazyTable: React.FC<{
  children: React.ReactNode;
  rows?: number;
  className?: string;
}> = ({ children, rows = 5, className = '' }) => (
  <LazySection
    className={className}
    fallback={
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="space-y-2 p-4">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    }
    threshold={0.1}
    rootMargin="100px"
  >
    {children}
  </LazySection>
);

export const LazyCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <LazySection
    className={className}
    fallback={
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <LoadingSkeleton lines={4} />
      </div>
    }
    threshold={0.1}
    rootMargin="50px"
  >
    {children}
  </LazySection>
);

export default LazySection;