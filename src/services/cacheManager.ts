import { ReleaseData } from "./types.js";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * In-memory cache manager for release data
 * Automatically expires entries based on TTL (time-to-live)
 */
export class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number; // milliseconds

  constructor(defaultTTLMinutes: number = 60) {
    this.defaultTTL = defaultTTLMinutes * 60 * 1000;
  }

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store data in cache with TTL
   */
  set<T>(key: string, data: T, ttlMinutes?: number): void {
    const ttl = (ttlMinutes ?? this.defaultTTL / 1000 / 60) * 60 * 1000;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Clear specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    keys: string[];
    expiringIn: Record<string, number>;
  } {
    const expiringIn: Record<string, number> = {};
    const keys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      keys.push(key);
      const remaining = entry.timestamp + entry.ttl - Date.now();
      expiringIn[key] = Math.max(0, remaining);
    }

    return {
      size: this.cache.size,
      keys,
      expiringIn,
    };
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() > entry.timestamp + entry.ttl;
  }
}
