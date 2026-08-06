import { ReleaseDataLoader } from "../services/releaseDataLoader.js";
import { CategorizedDataSource } from "../services/categorizedDataSource.js";
import { LiveDocumentationSource } from "../services/liveDocumentationSource.js";
import { CommvaultDocSource } from "../services/commvaultDocSource.js";
import { MockDataSource } from "../services/mockDataSource.js";
import { ReleaseData } from "../services/types.js";

/**
 * Release Manager
 * Singleton instance for managing release data loading and caching
 */
export class ReleaseManager {
  private static instance: ReleaseManager;
  private loader: ReleaseDataLoader;
  private releases: Map<string, ReleaseData> = new Map();
  private initialized = false;

  private constructor() {
    // Create data sources in order of preference
    const dataSources = [
      new CategorizedDataSource(), // Primary: Pre-categorized data from JSON
      new LiveDocumentationSource(), // Try live documentation
      new CommvaultDocSource({
        versions: ["11.44", "11.46", "12.0", "14.0", "15.0"],
      }),
      new MockDataSource(), // Fallback to mock data
    ];

    this.loader = new ReleaseDataLoader(dataSources, 60);
  }

  static getInstance(): ReleaseManager {
    if (!ReleaseManager.instance) {
      ReleaseManager.instance = new ReleaseManager();
    }
    return ReleaseManager.instance;
  }

  /**
   * Initialize and load specified versions
   */
  async initialize(versions: string[]): Promise<void> {
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
    console.error(
      `[ReleaseManager] Initialized with ${this.releases.size} versions`
    );
  }

  /**
   * Get release data (loads on-demand if not cached)
   */
  async getRelease(version: string): Promise<ReleaseData> {
    // Check local cache first
    if (this.releases.has(version)) {
      return this.releases.get(version)!;
    }

    // Load on demand
    const data = await this.loader.loadRelease(version);
    this.releases.set(version, data);
    return data;
  }

  /**
   * Get all loaded releases
   */
  getReleases(): Record<string, ReleaseData> {
    const result: Record<string, ReleaseData> = {};
    for (const [version, data] of this.releases) {
      result[version] = data;
    }
    return result;
  }

  /**
   * Get available versions
   */
  getAvailableVersions(): string[] {
    return Array.from(this.releases.keys());
  }

  /**
   * Get available categories
   */
  getAvailableCategories(): string[] {
    const categories = new Set<string>();
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
  async preload(versions: string[]): Promise<void> {
    const unloaded = versions.filter((v) => !this.releases.has(v));
    if (unloaded.length === 0) return;

    console.error(
      `[ReleaseManager] Preloading versions: ${unloaded.join(", ")}`
    );
    await this.initialize(unloaded);
  }

  /**
   * Clear cache for a specific version
   */
  invalidate(version: string): void {
    this.releases.delete(version);
    this.loader.invalidateCache(version);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.releases.clear();
    this.loader.clearCache();
  }

  /**
   * Get the data source used for a version
   */
  getDataSourceUsed(version: string): string {
    return this.loader.getSourceUsed(version);
  }

  /**
   * Get all data source usage info
   */
  getDataSourceInfo(): Record<string, string> {
    return this.loader.getSourceUsageInfo();
  }

  /**
   * Get diagnostic information
   */
  getDiagnostics(): {
    initialized: boolean;
    loadedVersions: string[];
    cacheSize: number;
    dataSources: string[];
    cacheStats: any;
    dataSourceUsage: Record<string, string>;
  } {
    return {
      initialized: this.initialized,
      loadedVersions: this.getAvailableVersions(),
      cacheSize: this.releases.size,
      dataSources: this.loader.getDataSources(),
      cacheStats: this.loader.getCacheStats(),
      dataSourceUsage: this.getDataSourceInfo(),
    };
  }
}
