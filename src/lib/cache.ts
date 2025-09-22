interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

class SimpleCache {
  private cache = new Map<string, CacheItem<any>>();

  set<T>(key: string, data: T, expiresInMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn: expiresInMs
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const isExpired = Date.now() - item.timestamp > item.expiresIn;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    const isExpired = Date.now() - item.timestamp > item.expiresIn;
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

export const appCache = new SimpleCache();