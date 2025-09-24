'use client';

import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function trackWebVitals() {
  // Only track in production
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const reportWebVital = ({ name, value, delta, id }: any) => {
    // Track performance metrics
    console.log(`[Performance] ${name}:`, {
      value: Math.round(value),
      delta: Math.round(delta),
      id,
      timestamp: Date.now()
    });

    // You can send these to your analytics service
    // Example: analytics.track('Performance Metric', { name, value, delta, id });
  };

  // Track Core Web Vitals
  getCLS(reportWebVital);
  getFID(reportWebVital);
  getFCP(reportWebVital);
  getLCP(reportWebVital);
  getTTFB(reportWebVital);
}

export class PerformanceMonitor {
  private static timers = new Map<string, number>();

  static startTimer(label: string): void {
    this.timers.set(label, performance.now());
  }

  static endTimer(label: string): number {
    const start = this.timers.get(label);
    if (!start) return 0;

    const duration = performance.now() - start;
    this.timers.delete(label);

    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  static measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.startTimer(label);
      try {
        const result = await fn();
        this.endTimer(label);
        resolve(result);
      } catch (error) {
        this.endTimer(label);
        reject(error);
      }
    });
  }
}

// React Query performance observer
export function observeQueryPerformance() {
  if (typeof window === 'undefined') return;

  // Observe long query times
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.duration > 1000) { // Queries taking > 1 second
        console.warn(`[Performance] Slow query detected:`, {
          name: entry.name,
          duration: Math.round(entry.duration),
          type: entry.entryType
        });
      }
    });
  });

  observer.observe({ entryTypes: ['measure', 'navigation'] });
}

// Memory usage tracking
export function trackMemoryUsage() {
  if (typeof window === 'undefined' || !('memory' in performance)) {
    return null;
  }

  const memory = (performance as any).memory;
  return {
    usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
    totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
    jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
  };
}

export const perf = PerformanceMonitor;