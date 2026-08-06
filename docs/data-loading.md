# Release Data Loading Architecture

## Overview

The data loading system has been redesigned to fetch release information dynamically from Commvault documentation sources instead of relying on hardcoded data. This architecture supports multiple data sources with automatic fallback and caching.

## Architecture

### Components

```
┌──────────────────────────────────────────────────────────────┐
│                     ReleaseManager                           │
│  (Singleton - coordinates data loading and caching)          │
└────────────────┬─────────────────────────────────────────────┘
                 │
         ┌───────┴───────┐
         │               │
    ┌────▼────┐    ┌────▼──────────────┐
    │  Cache  │    │ ReleaseDataLoader │
    │ Manager │    │  (multi-source)   │
    └─────────┘    └────┬──────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
   ┌────▼────────┐ ┌───▼─────────┐ ┌──▼──────────┐
   │ Commvault   │ │ Mock Data   │ │ Custom      │
   │ Doc Source  │ │ Source      │ │ Sources     │
   └─────────────┘ └─────────────┘ └─────────────┘
```

### Core Classes

#### `ReleaseManager` (Singleton)

**Location**: `src/data/releaseManager.ts`

Coordinates all release data operations. Ensures a single instance manages caching and loading across the application.

**Key Methods:**
- `getInstance()` - Get singleton instance
- `initialize(versions: string[])` - Load specified versions on startup
- `getRelease(version: string)` - Get release data (loads on-demand if not cached)
- `getReleases()` - Get all loaded releases
- `getAvailableVersions()` - List loaded versions
- `getAvailableCategories()` - List all available categories
- `preload(versions: string[])` - Preload versions for performance
- `invalidate(version: string)` - Clear cache for specific version
- `clearCache()` - Clear all cached data
- `getDiagnostics()` - Get diagnostic information

**Usage:**
```typescript
const manager = ReleaseManager.getInstance();
await manager.initialize(["11.44", "11.46"]);
const release = await manager.getRelease("11.44");
console.log(manager.getAvailableVersions()); // ["11.44", "11.46"]
```

#### `ReleaseDataLoader`

**Location**: `src/services/releaseDataLoader.ts`

Manages multiple data sources with automatic fallback. Tries each source in order until one succeeds.

**Features:**
- Multi-source support with priority ordering
- Transparent fallback to next source on failure
- Deduplication of concurrent requests
- Configurable cache TTL

**Key Methods:**
- `loadRelease(version: string)` - Load from first available source
- `loadReleases(versions: string[])` - Load multiple in parallel
- `getDataSources()` - List registered sources
- `invalidateCache(version: string)` - Clear specific cache entry
- `clearCache()` - Clear all cache

#### `CacheManager`

**Location**: `src/services/cacheManager.ts`

In-memory cache with automatic TTL-based expiration.

**Features:**
- TTL-based auto-expiration
- Get cache statistics
- Per-entry TTL configuration

**Key Methods:**
- `get<T>(key: string)` - Get cached value or null if expired
- `set<T>(key: string, data: T, ttlMinutes?: number)` - Store with TTL
- `invalidate(key: string)` - Delete specific entry
- `clear()` - Clear all entries
- `getStats()` - Get cache metrics

### Data Sources

#### `CommvaultDocSource`

**Location**: `src/services/commvaultDocSource.ts`

Fetches release information from official Commvault documentation pages.

**Features:**
- HTTP fetching with User-Agent spoofing
- HTML parsing and content extraction
- Category-based change extraction
- Configurable documentation URL mapping

**Supported Versions:**
- 11.44, 11.46, 12.0, 14.0, 15.0

**Configuration:**
```typescript
const source = new CommvaultDocSource({
  baseUrl: "https://documentation.commvault.com",
  versions: ["11.44", "11.46", "12.0", "14.0", "15.0"]
});

const data = await source.fetch("11.44");
```

**Known Limitations:**
- Requires network access
- Depends on Commvault documentation structure
- HTML parsing is regex-based (not a full DOM parser)
- May fail if documentation format changes

#### `MockDataSource`

**Location**: `src/services/mockDataSource.ts`

Provides realistic test data for versions 11.44 and 11.46. Used as fallback when web sources are unavailable.

**Features:**
- Pre-generated realistic release data
- Includes all standard categories
- Simulates network delay (100ms)

**Supported Versions:**
- 11.44, 11.46

**Usage:**
```typescript
const mockSource = new MockDataSource();
const data = await mockSource.fetch("11.44");
console.log(mockSource.getAvailableVersions()); // ["11.44", "11.46"]
```

#### Creating Custom Data Sources

Implement the `DataSource` interface:

```typescript
import { DataSource, ReleaseData } from "./services/types.js";

export class CustomDataSource implements DataSource {
  name = "My Custom Source";
  description = "Fetches from my own API";

  async fetch(version: string): Promise<ReleaseData> {
    // Your implementation here
    return {
      version,
      releaseDate: "2024-01-01",
      categories: {
        Virtualization: [],
        Security: [],
        Database: [],
        Storage: [],
        APIs: [],
        "User Experience": [],
      }
    };
  }
}
```

Register in `releaseManager.ts`:

```typescript
const dataSources = [
  new CustomDataSource(),
  new CommvaultDocSource({...}),
  new MockDataSource(),
];
```

## Data Flow

### Initialization Flow

```
main()
  ↓
ReleaseManager.initialize(["11.44", "11.46"])
  ↓
For each version:
  ├─ Check cache
  ├─ If not cached:
  │  ├─ Try CommvaultDocSource.fetch()
  │  ├─ On error, try MockDataSource.fetch()
  │  └─ Store result in cache
  └─ Return to caller
  ↓
Tool definitions generated with available versions/categories
  ↓
MCP server ready
```

### Runtime Query Flow

```
User calls tool (e.g., compare_releases)
  ↓
ReleaseManager.getRelease(version1)
  ├─ Check cache
  ├─ If cached: return immediately
  ├─ If not cached:
  │  ├─ Try CommvaultDocSource.fetch()
  │  ├─ On error, try MockDataSource.fetch()
  │  └─ Cache result
  └─ Return to caller
  ↓
Tool handler processes data
  ↓
Return result to user
```

## Caching Strategy

### Cache Keys

Cache keys follow the pattern: `release:{version}`

Example: `release:11.44`

### TTL Configuration

- Default TTL: 60 minutes
- Can be overridden per entry
- Configurable per `ReleaseDataLoader` instance

### Cache Statistics

```typescript
const manager = ReleaseManager.getInstance();
const stats = manager.getDiagnostics();
console.log(stats.cacheStats);
// {
//   size: 2,
//   keys: ["release:11.44", "release:11.46"],
//   expiringIn: {
//     "release:11.44": 3599000,  // ms remaining
//     "release:11.46": 3599000
//   }
// }
```

## Error Handling

### Source Failures

When a data source fails, the loader automatically tries the next source:

```
CommvaultDocSource fails (network error)
  ↓
Try MockDataSource
  ↓
If all sources fail:
  ↓
Throw error with details from all sources
```

### Error Messages

```
Failed to load version 15.0 from all data sources. Errors:
  Commvault Documentation: HTTP 404: Not Found
  Mock Data: Mock data not available for version 15.0
```

## Performance Considerations

### Cold Start

First query for a version requires fetching from a source (100-500ms typically).

### Warm Cache

Subsequent queries return instantly from cache.

### Concurrent Requests

Multiple simultaneous requests for the same version are deduplicated - only one fetch occurs, results shared.

### Memory Usage

- Each release ≈ 50-100 KB (depending on number of changes)
- 10 versions ≈ 0.5-1 MB
- Monitor with `ReleaseManager.getDiagnostics().cacheSize`

## Configuration

### Environment Variables

Currently none, but can be added:

```typescript
const cacheTTL = parseInt(process.env.CACHE_TTL_MINUTES || "60");
const loader = new ReleaseDataLoader(sources, cacheTTL);
```

### Startup Configuration

Edit `src/index.ts` main() function:

```typescript
async function main() {
  // Change versions to load
  await releaseManager.initialize(["11.44", "11.46", "12.0", "14.0", "15.0"]);
  
  // ... rest of startup
}
```

## Testing

### Unit Tests (Future)

Test individual sources:

```typescript
const mockSource = new MockDataSource();
const data = await mockSource.fetch("11.44");
expect(data.version).toBe("11.44");
expect(Object.keys(data.categories).length).toBeGreaterThan(0);
```

### Integration Tests (Future)

Test ReleaseManager with multiple sources:

```typescript
const manager = ReleaseManager.getInstance();
await manager.preload(["11.44", "11.46"]);
const v1 = await manager.getRelease("11.44");
const v2 = await manager.getRelease("11.46");
expect(v1.version).toBe("11.44");
expect(v2.version).toBe("11.46");
```

## Troubleshooting

### Issue: "Failed to load version X from all data sources"

**Causes:**
1. Version not in data source
2. Network connectivity issues (for web sources)
3. Documentation structure changed

**Solutions:**
- Check available versions with `manager.getAvailableVersions()`
- Verify network connectivity
- Update HTML parsing in `CommvaultDocSource` if docs changed
- Add mock data for the version

### Issue: Cache not expiring

**Cause:** TTL configuration issue

**Solution:**
```typescript
// Clear specific entry
manager.invalidate("11.44");

// Clear all
manager.clearCache();

// Check diagnostics
console.log(manager.getDiagnostics().cacheStats);
```

### Issue: High memory usage

**Cause:** Too many versions cached

**Solution:**
```typescript
// Load only needed versions
await manager.initialize(["11.44", "11.46"]);

// Clear cache periodically
manager.clearCache();

// Monitor usage
const diag = manager.getDiagnostics();
console.log(`Cache size: ${diag.cacheSize} versions`);
```

## Future Enhancements

1. **Database Caching**: Persist cache to disk/database
2. **Async Loading**: Non-blocking background refresh
3. **Version Discovery**: Auto-detect available versions from source
4. **Change Detection**: Notify on new/updated release data
5. **Streaming Responses**: Large releases streamed instead of buffered
6. **Custom Parsers**: pluggable HTML/JSON parsers
7. **Rate Limiting**: Prevent source API abuse
8. **Metrics Collection**: Track source reliability and latency

## API Reference

See `src/services/types.ts` for full type definitions:

```typescript
interface Change {
  id: string;
  title: string;
  description: string;
}

interface ReleaseData {
  version: string;
  releaseDate: string;
  categories: Record<string, Change[]>;
}

interface DataSource {
  name: string;
  description: string;
  fetch(version: string): Promise<ReleaseData>;
}
```
