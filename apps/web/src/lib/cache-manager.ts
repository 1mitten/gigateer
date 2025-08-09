'use client';

import { checkNetworkConnectivity } from './pwa-utils';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  version?: string; // Cache version for invalidation
  forceNetwork?: boolean; // Force network request
  fallbackToCache?: boolean; // Use cache if network fails
}

export class CacheManager {
  private readonly cachePrefix = 'gigateer_cache_';
  private readonly defaultTTL = 15 * 60 * 1000; // 15 minutes
  private readonly version = '1.0.0';

  /**
   * Get data with intelligent caching strategy
   */
  async get<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    const {
      ttl = this.defaultTTL,
      version = this.version,
      forceNetwork = false,
      fallbackToCache = true,
    } = options;

    const cacheKey = this.getCacheKey(key);

    // Check cache first if not forcing network
    if (!forceNetwork) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached && this.isCacheValid(cached, ttl, version)) {
        console.log(`[Cache] Hit for ${key}`);
        return cached.data;
      }
    }

    try {
      // Check network connectivity
      const isOnline = await checkNetworkConnectivity(3000);
      if (!isOnline && fallbackToCache) {
        const cached = this.getFromCache<T>(cacheKey);
        if (cached) {
          console.log(`[Cache] Using stale cache for ${key} (offline)`);
          return cached.data;
        }
      }

      // Fetch from network
      console.log(`[Cache] Network fetch for ${key}`);
      const data = await fetcher();
      
      // Cache the result
      this.setCache(cacheKey, data, ttl, version);
      
      return data;
    } catch (error) {
      // Network failed, try cache fallback
      if (fallbackToCache) {
        const cached = this.getFromCache<T>(cacheKey);
        if (cached) {
          console.log(`[Cache] Fallback to cache for ${key} due to error:`, error);
          return cached.data;
        }
      }
      
      throw error;
    }
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, ttl: number = this.defaultTTL, version: string = this.version): void {
    const cacheKey = this.getCacheKey(key);
    this.setCache(cacheKey, data, ttl, version);
  }

  /**
   * Get data from cache (if valid)
   */
  getCached<T>(key: string, ttl: number = this.defaultTTL, version: string = this.version): T | null {
    const cacheKey = this.getCacheKey(key);
    const cached = this.getFromCache<T>(cacheKey);
    
    if (cached && this.isCacheValid(cached, ttl, version)) {
      return cached.data;
    }
    
    return null;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    const cacheKey = this.getCacheKey(key);
    localStorage.removeItem(cacheKey);
    console.log(`[Cache] Invalidated ${key}`);
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAll(): void {
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(this.cachePrefix)
    );
    
    keys.forEach(key => localStorage.removeItem(key));
    console.log(`[Cache] Invalidated ${keys.length} entries`);
  }

  /**
   * Get cache statistics
   */
  getStats(): { totalEntries: number; totalSize: number; entries: Array<{ key: string; size: number; age: number }> } {
    const entries: Array<{ key: string; size: number; age: number }> = [];
    let totalSize = 0;

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.cachePrefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          const size = new Blob([value]).size;
          totalSize += size;
          
          try {
            const entry = JSON.parse(value) as CacheEntry<any>;
            entries.push({
              key: key.replace(this.cachePrefix, ''),
              size,
              age: Date.now() - entry.timestamp,
            });
          } catch {
            // Invalid cache entry, remove it
            localStorage.removeItem(key);
          }
        }
      }
    });

    return {
      totalEntries: entries.length,
      totalSize,
      entries: entries.sort((a, b) => b.age - a.age),
    };
  }

  /**
   * Clean up expired cache entries
   */
  cleanup(): number {
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(this.cachePrefix)
    );
    
    let cleaned = 0;

    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const entry = JSON.parse(value) as CacheEntry<any>;
          if (!this.isCacheValid(entry, entry.ttl, entry.version)) {
            localStorage.removeItem(key);
            cleaned++;
          }
        } catch {
          // Invalid cache entry, remove it
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    });

    if (cleaned > 0) {
      console.log(`[Cache] Cleaned up ${cleaned} expired entries`);
    }

    return cleaned;
  }

  private getCacheKey(key: string): string {
    return `${this.cachePrefix}${key}`;
  }

  private getFromCache<T>(cacheKey: string): CacheEntry<T> | null {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('[Cache] Failed to parse cache entry:', cacheKey, error);
      // Remove corrupted cache entry
      localStorage.removeItem(cacheKey);
    }
    
    return null;
  }

  private setCache<T>(cacheKey: string, data: T, ttl: number, version: string): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        version,
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
      console.warn('[Cache] Failed to store cache entry:', cacheKey, error);
      
      // Try to free up space by cleaning old entries
      this.cleanup();
      
      // Try once more
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data,
          timestamp: Date.now(),
          ttl,
          version,
        }));
      } catch (secondError) {
        console.error('[Cache] Failed to store cache entry after cleanup:', cacheKey, secondError);
      }
    }
  }

  private isCacheValid<T>(entry: CacheEntry<T>, requiredTTL: number, requiredVersion: string): boolean {
    // Check version compatibility
    if (entry.version !== requiredVersion) {
      return false;
    }
    
    // Check TTL
    const age = Date.now() - entry.timestamp;
    return age < requiredTTL;
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

// Auto cleanup on app start
if (typeof window !== 'undefined') {
  // Clean up expired entries on load
  setTimeout(() => {
    cacheManager.cleanup();
  }, 1000);

  // Periodic cleanup every 5 minutes
  setInterval(() => {
    cacheManager.cleanup();
  }, 5 * 60 * 1000);
}