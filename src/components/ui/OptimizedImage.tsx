import React, { useState, useRef, useEffect } from 'react';
import { User } from 'lucide-react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  loading?: 'lazy' | 'eager';
  onError?: () => void;
  onLoad?: () => void;
  placeholder?: string; // Base64 or low-res placeholder
  sizes?: string; // Responsive sizes
  priority?: boolean; // For above-fold images
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  fallbackIcon = <User className="w-full h-full" />,
  loading = 'lazy',
  onError,
  onLoad,
  placeholder,
  sizes,
  priority = false
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading (skip if priority)
  useEffect(() => {
    if (loading !== 'lazy' || priority || !containerRef.current) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [loading]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div 
        ref={containerRef}
        className={`flex items-center justify-center bg-gray-100 rounded-full ${className}`}
        role="img"
        aria-label={alt}
      >
        {fallbackIcon}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Placeholder/skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-full">
          {placeholder && (
            <img
              src={placeholder}
              alt=""
              className="w-full h-full object-cover rounded-full opacity-60 blur-sm"
              aria-hidden="true"
            />
          )}
        </div>
      )}

      {/* Actual image */}
      {isInView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`w-full h-full object-cover rounded-full transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          loading={priority ? 'eager' : loading}
          sizes={sizes}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
