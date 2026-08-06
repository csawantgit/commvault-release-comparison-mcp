import { DataSource, ReleaseData } from "./types.js";
import { CacheManager } from "./cacheManager.js";

/**
 * Release Data Loader
 * Coordinates fetching release data from data sources with caching
 */
export class ReleaseDataLoader {
  private dataSources: Map<string, DataSource>;
  private cache: CacheManager;
  private loadingPromises: Map<string, Promise<ReleaseData>> = new Map();

  constructor(dataSources: DataSource[], cacheTTLMinutes: number = 60) {
    this.dataSources = new Map(dataSources.map((ds) => [ds.name, ds]));
    this.cache = new CacheManager(cacheTTLMinutes);
  }

  /**
   * Load release data from the first available data source
   * Results are cached to avoid repeated fetches
   */
  async loadRelease(version: string): Promise<ReleaseData> {
    // Check cache first
    const cacheKey = `release:${version}`;
    const cached = this.cache.get<ReleaseData>(cacheKey);
    if (cached) {
      console.error(`[Cache HIT] ${version}`);
      return cached;
    }

    // Return existing loading promise if one is in progress
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey)!;
    }

    // Start new loading operation
    const loadingPromise = this.performLoad(version, cacheKey);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const result = await loadingPromise;
      return result;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  private async performLoad(
    version: string,
    cacheKey: string
  ): Promise<ReleaseData> {
    const errors: Array<{ source: string; error: string }> = [];

    for (const [sourceName, dataSource] of this.dataSources) {
      try {
        console.error(`[Loading] ${version} from ${sourceName}...`);
        const data = await dataSource.fetch(version);
        this.cache.set(cacheKey, data);
        console.error(
          `[Loaded] ${version} from ${sourceName} (${Object.keys(data.categories).length} categories)`
        );
        return data;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push({ source: sourceName, error: errorMsg });
      }
    }

    // All sources failed
    const errorDetails = errors
      .map((e) => `${e.source}: ${e.error}`)
      .join("; ");
    throw new Error(
      `Failed to load version ${version} from all data sources. Errors: ${errorDetails}`
    );
  }

  /**
   * Load multiple releases in parallel
   */
  async loadReleases(versions: string[]): Promise<Record<string, ReleaseData>> {
    const results: Record<string, ReleaseData> = {};

    const promises = versions.map(async (version) => {
      try {
        results[version] = await this.loadRelease(version);
      } catch (error) {
        console.error(
          `Error loading ${version}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Get available data sources
   */
  getDataSources(): string[] {
    return Array.from(this.dataSources.keys());
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    return this.cache.getStats();
  }

  /**
   * Clear cache for a specific version
   */
  invalidateCache(version: string): void {
    this.cache.invalidate(`release:${version}`);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
