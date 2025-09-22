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

export const perf = PerformanceMonitor;