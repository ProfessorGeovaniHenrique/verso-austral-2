interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class DevOpsCacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };
    
    this.memoryCache.set(key, entry);
    
    // Also save to localStorage for persistence
    try {
      localStorage.setItem(`devops_cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  get<T>(key: string): T | null {
    // Try memory cache first
    let entry = this.memoryCache.get(key) as CacheEntry<T> | undefined;
    
    // If not in memory, try localStorage
    if (!entry) {
      try {
        const stored = localStorage.getItem(`devops_cache_${key}`);
        if (stored) {
          entry = JSON.parse(stored);
          if (entry) {
            this.memoryCache.set(key, entry);
          }
        }
      } catch (error) {
        console.warn('Failed to load from localStorage:', error);
      }
    }
    
    if (!entry) return null;
    
    // Check if expired
    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.invalidate(key);
      return null;
    }
    
    return entry.data;
  }

  invalidate(key: string): void {
    this.memoryCache.delete(key);
    try {
      localStorage.removeItem(`devops_cache_${key}`);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }

  clear(): void {
    this.memoryCache.clear();
    
    // Clear all devops cache from localStorage
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('devops_cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  size(): number {
    return this.memoryCache.size;
  }

  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }
}

export const cacheManager = new DevOpsCacheManager();
