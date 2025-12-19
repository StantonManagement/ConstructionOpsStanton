'use client';

import React, { useState, useRef, useEffect, ReactNode, memo, useCallback } from 'react';
import IntersectionObserverManager, { LazyLoadingConfigs } from '@/lib/intersectionObserver';

const DefaultPlaceholder = ({ className, height }: { className: string; height: number }) => (
  <div
    className={`bg-secondary rounded-lg animate-pulse ${className}`}
    style={{ height: `${height}px` }}
  >
    <div className="p-4 space-y-3">
      <div className="h-4 bg-secondary/80 rounded w-3/4"></div>
      <div className="h-3 bg-secondary/80 rounded w-1/2"></div>
      <div className="space-y-2">
        <div className="h-2 bg-secondary/80 rounded"></div>
        <div className="h-2 bg-secondary/80 rounded w-5/6"></div>
      </div>
    </div>
  </div>
);

interface LazyCardProps {
  children: ReactNode;
  height?: number;
  className?: string;
  threshold?: number;
  rootMargin?: string;
  placeholder?: ReactNode;
  fadeIn?: boolean;
  config?: keyof typeof LazyLoadingConfigs;
}

const LazyCard = memo<LazyCardProps>(({
  children,
  height = 200,
  className = '',
  threshold = 0.1,
  rootMargin = '50px',
  placeholder,
  fadeIn = true,
  config = 'cards'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleIntersection = useCallback(() => {
    setIsVisible(true);
    // Small delay to allow for smooth loading animation
    requestAnimationFrame(() => {
      setTimeout(() => setIsLoaded(true), 50);
    });
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observerManager = IntersectionObserverManager.getInstance();

    // Use predefined config or custom options
    const options = config in LazyLoadingConfigs
      ? LazyLoadingConfigs[config]
      : { threshold, rootMargin };

    observerManager.observe(element, handleIntersection, options);

    return () => {
      if (element) {
        observerManager.unobserve(element);
      }
    };
  }, [handleIntersection, threshold, rootMargin, config]);

  return (
    <div
      ref={ref}
      className={`transition-opacity duration-300 ${
        fadeIn && isLoaded ? 'opacity-100' : fadeIn && isVisible ? 'opacity-0' : ''
      } ${className}`}
    >
      {isVisible ? (
        <div
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {children}
        </div>
      ) : (
        placeholder || <DefaultPlaceholder className={className} height={height} />
      )}
    </div>
  );
});

LazyCard.displayName = 'LazyCard';

export default LazyCard;