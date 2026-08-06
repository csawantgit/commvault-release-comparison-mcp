/**
 * In-memory cache manager for release data
 * Automatically expires entries based on TTL (time-to-live)
 */
export class CacheManager {
    constructor(defaultTTLMinutes = 60) {
        this.cache = new Map();
        this.defaultTTL = defaultTTLMinutes * 60 * 1000;
    }
    /**
     * Get cached data if available and not expired
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        if (this.isExpired(entry)) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    /**
     * Store data in cache with TTL
     */
    set(key, data, ttlMinutes) {
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
    invalidate(key) {
        this.cache.delete(key);
    }
    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const expiringIn = {};
        const keys = [];
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
    isExpired(entry) {
        return Date.now() > entry.timestamp + entry.ttl;
    }
}
