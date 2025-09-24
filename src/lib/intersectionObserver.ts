'use client';

// Intersection Observer Manager for optimal performance
class IntersectionObserverManager {
  private static instance: IntersectionObserverManager;
  private observers: Map<string, IntersectionObserver> = new Map();
  private callbacks: Map<Element, () => void> = new Map();

  static getInstance(): IntersectionObserverManager {
    if (!IntersectionObserverManager.instance) {
      IntersectionObserverManager.instance = new IntersectionObserverManager();
    }
    return IntersectionObserverManager.instance;
  }

  // Create or get existing observer with specific options
  private getObserver(options: IntersectionObserverInit): IntersectionObserver {
    const key = JSON.stringify(options);

    if (!this.observers.has(key)) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const callback = this.callbacks.get(entry.target);
            if (callback) {
              callback();
              this.unobserve(entry.target as HTMLElement);
            }
          }
        });
      }, options);

      this.observers.set(key, observer);
    }

    return this.observers.get(key)!;
  }

  // Observe an element with callback
  observe(
    element: HTMLElement,
    callback: () => void,
    options: IntersectionObserverInit = {}
  ): void {
    // Default optimized options
    const defaultOptions: IntersectionObserverInit = {
      threshold: 0.1,
      rootMargin: '50px',
      ...options,
    };

    const observer = this.getObserver(defaultOptions);
    this.callbacks.set(element, callback);
    observer.observe(element);
  }

  // Unobserve an element
  unobserve(element: HTMLElement): void {
    this.callbacks.delete(element);

    // Find and unobserve from all observers
    this.observers.forEach((observer) => {
      observer.unobserve(element);
    });
  }

  // Clean up observers when no longer needed
  cleanup(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
    this.callbacks.clear();
  }
}

// Hook for using the intersection observer
export function useIntersectionObserver(
  callback: () => void,
  options?: IntersectionObserverInit,
  deps: any[] = []
): (element: HTMLElement | null) => void {
  const observerManager = IntersectionObserverManager.getInstance();

  return (element: HTMLElement | null) => {
    if (element) {
      observerManager.observe(element, callback, options);
    }
  };
}

// Prebuilt configurations for common use cases
export const LazyLoadingConfigs = {
  // For cards that should load just before coming into view
  cards: {
    threshold: 0.1,
    rootMargin: '100px',
  },

  // For images that should load early
  images: {
    threshold: 0,
    rootMargin: '200px',
  },

  // For heavy components that should load very close to viewport
  heavy: {
    threshold: 0.2,
    rootMargin: '50px',
  },

  // For infinite scroll
  infiniteScroll: {
    threshold: 1.0,
    rootMargin: '0px',
  },
} as const;

export default IntersectionObserverManager;