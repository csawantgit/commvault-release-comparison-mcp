import { ReleaseDataLoader } from "../services/releaseDataLoader.js";
import { LiveDocumentationSource } from "../services/liveDocumentationSource.js";
import { CommvaultDocSource } from "../services/commvaultDocSource.js";
import { MockDataSource } from "../services/mockDataSource.js";
/**
 * Release Manager
 * Singleton instance for managing release data loading and caching
 */
export class ReleaseManager {
    constructor() {
        this.releases = new Map();
        this.initialized = false;
        // Create data sources in order of preference
        const dataSources = [
            new LiveDocumentationSource(), // Try live documentation first
            new CommvaultDocSource({
                versions: ["11.44", "11.46", "12.0", "14.0", "15.0"],
            }),
            new MockDataSource(), // Fallback to mock data
        ];
        this.loader = new ReleaseDataLoader(dataSources, 60);
    }
    static getInstance() {
        if (!ReleaseManager.instance) {
            ReleaseManager.instance = new ReleaseManager();
        }
        return ReleaseManager.instance;
    }
    /**
     * Initialize and load specified versions
     */
    async initialize(versions) {
        if (this.initialized && this.releases.size > 0) {
            return;
        }
        console.error(`[ReleaseManager] Initializing with versions: ${versions.join(", ")}`);
        const loadedData = await this.loader.loadReleases(versions);
        for (const [version, data] of Object.entries(loadedData)) {
            if (data) {
                this.releases.set(version, data);
            }
        }
        this.initialized = true;
        console.error(`[ReleaseManager] Initialized with ${this.releases.size} versions`);
    }
    /**
     * Get release data (loads on-demand if not cached)
     */
    async getRelease(version) {
        // Check local cache first
        if (this.releases.has(version)) {
            return this.releases.get(version);
        }
        // Load on demand
        const data = await this.loader.loadRelease(version);
        this.releases.set(version, data);
        return data;
    }
    /**
     * Get all loaded releases
     */
    getReleases() {
        const result = {};
        for (const [version, data] of this.releases) {
            result[version] = data;
        }
        return result;
    }
    /**
     * Get available versions
     */
    getAvailableVersions() {
        return Array.from(this.releases.keys());
    }
    /**
     * Get available categories
     */
    getAvailableCategories() {
        const categories = new Set();
        for (const release of this.releases.values()) {
            for (const category of Object.keys(release.categories)) {
                categories.add(category);
            }
        }
        return Array.from(categories).sort();
    }
    /**
     * Preload specific versions for faster access
     */
    async preload(versions) {
        const unloaded = versions.filter((v) => !this.releases.has(v));
        if (unloaded.length === 0)
            return;
        console.error(`[ReleaseManager] Preloading versions: ${unloaded.join(", ")}`);
        await this.initialize(unloaded);
    }
    /**
     * Clear cache for a specific version
     */
    invalidate(version) {
        this.releases.delete(version);
        this.loader.invalidateCache(version);
    }
    /**
     * Clear all cache
     */
    clearCache() {
        this.releases.clear();
        this.loader.clearCache();
    }
    /**
     * Get diagnostic information
     */
    getDiagnostics() {
        return {
            initialized: this.initialized,
            loadedVersions: this.getAvailableVersions(),
            cacheSize: this.releases.size,
            dataSources: this.loader.getDataSources(),
            cacheStats: this.loader.getCacheStats(),
        };
    }
}
