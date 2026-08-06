# Data Sources Configuration Guide

## Quick Start

The default configuration loads data from two sources in this order:

1. **CommvaultDocSource** - Fetches from official Commvault documentation
2. **MockDataSource** - Provides test data as fallback

This is configured in `src/data/releaseManager.ts`:

```typescript
const dataSources = [
  new CommvaultDocSource({
    versions: ["11.44", "11.46", "12.0", "14.0", "15.0"],
  }),
  new MockDataSource(), // Fallback to mock data
];
```

## Configuration Scenarios

### Scenario 1: Online (Default)

**Use Commvault docs with mock fallback**

```typescript
// src/data/releaseManager.ts
const dataSources = [
  new CommvaultDocSource({
    versions: ["11.44", "11.46"],
  }),
  new MockDataSource(),
];
```

**Pros:**
- Real data from official source
- Automatic fallback for reliability
- Works offline for v11.44 and v11.46

**Cons:**
- Requires internet for first load
- Depends on documentation structure

---

### Scenario 2: Mock Only

**Use mock data for development/testing**

```typescript
// src/data/releaseManager.ts
const dataSources = [
  new MockDataSource(),
];
```

**Pros:**
- No external dependencies
- Instant loads (no network delay)
- Perfect for testing

**Cons:**
- Data may not match real releases

---

### Scenario 3: Custom API Source

**Fetch from your own API**

First, create a custom source:

```typescript
// src/services/customApiSource.ts
import { DataSource, ReleaseData } from "./types.js";

export class CustomApiSource implements DataSource {
  name = "Custom API";
  description = "Fetches from internal API";
  
  private apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  async fetch(version: string): Promise<ReleaseData> {
    const response = await fetch(`${this.apiUrl}/releases/${version}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  }
}
```

Then register it:

```typescript
// src/data/releaseManager.ts
import { CustomApiSource } from "../services/customApiSource.js";

const dataSources = [
  new CustomApiSource("https://internal.example.com/api"),
  new MockDataSource(),
];
```

**API Response Format:**

```json
{
  "version": "11.44",
  "releaseDate": "2023-04-15",
  "categories": {
    "Virtualization": [
      {
        "id": "virt-001",
        "title": "Feature name",
        "description": "Feature description"
      }
    ]
  }
}
```

---

### Scenario 4: Database Source

**Load from database**

```typescript
// src/services/databaseSource.ts
import { DataSource, ReleaseData } from "./types.js";

export class DatabaseSource implements DataSource {
  name = "PostgreSQL";
  description = "Fetches from PostgreSQL database";
  
  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  async fetch(version: string): Promise<ReleaseData> {
    // Example using a hypothetical database client
    const release = await db.releases.findOne({ version });
    
    if (!release) {
      throw new Error(`Version not found: ${version}`);
    }

    return {
      version: release.version,
      releaseDate: release.release_date,
      categories: JSON.parse(release.categories_json),
    };
  }
}
```

Register:

```typescript
// src/data/releaseManager.ts
import { DatabaseSource } from "../services/databaseSource.js";

const dataSources = [
  new DatabaseSource(process.env.DATABASE_URL || "postgresql://localhost/releases"),
  new MockDataSource(),
];
```

---

### Scenario 5: Multi-Source with Priorities

**Use multiple sources with specific version assignments**

```typescript
// src/services/priorityDataSource.ts
import { DataSource, ReleaseData } from "./types.js";

export class PriorityDataSource implements DataSource {
  name = "Multi-Source with Priorities";
  description = "Routes versions to appropriate sources";
  
  private sources: Map<string, DataSource> = new Map();
  private versionToSource: Record<string, string> = {};

  constructor(
    sources: DataSource[],
    versionMapping: Record<string, string>
  ) {
    sources.forEach(s => this.sources.set(s.name, s));
    this.versionToSource = versionMapping;
  }

  async fetch(version: string): Promise<ReleaseData> {
    const sourceName = this.versionToSource[version];
    const source = this.sources.get(sourceName);

    if (!source) {
      throw new Error(
        `No source configured for version ${version}`
      );
    }

    return await source.fetch(version);
  }
}
```

Register:

```typescript
// src/data/releaseManager.ts
import { PriorityDataSource } from "../services/priorityDataSource.js";

const sources = [
  new CommvaultDocSource({ versions: ["11.44", "11.46"] }),
  new CustomApiSource("https://api.example.com"),
];

const dataSources = [
  new PriorityDataSource(sources, {
    "11.44": "Commvault Documentation",
    "11.46": "Commvault Documentation",
    "12.0": "Custom API",
    "14.0": "Custom API",
    "15.0": "Custom API",
  }),
  new MockDataSource(), // Final fallback
];
```

---

### Scenario 6: Cached + File Source

**Load from local cache file**

```typescript
// src/services/fileSource.ts
import { DataSource, ReleaseData } from "./types.js";
import fs from "fs/promises";
import path from "path";

export class FileSource implements DataSource {
  name = "File Cache";
  description = "Loads release data from JSON files";
  
  private cacheDir: string;

  constructor(cacheDir: string = "./release-cache") {
    this.cacheDir = cacheDir;
  }

  async fetch(version: string): Promise<ReleaseData> {
    const filePath = path.join(this.cacheDir, `${version}.json`);
    
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Failed to read cache file for ${version}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
```

Register:

```typescript
// src/data/releaseManager.ts
import { FileSource } from "../services/fileSource.js";

const dataSources = [
  new CommvaultDocSource({ versions: ["11.44", "11.46"] }),
  new FileSource("./release-cache"),
  new MockDataSource(),
];
```

Cache files structure:

```
release-cache/
├── 11.44.json
├── 11.46.json
├── 12.0.json
└── 14.0.json
```

File format:

```json
{
  "version": "11.44",
  "releaseDate": "2023-04-15",
  "categories": {
    "Virtualization": [...],
    "Security": [...]
  }
}
```

---

## Environment Variables

Add to your `.env` or deployment configuration:

```bash
# Data source configuration
DATA_SOURCES=commvault,mock
CACHE_TTL_MINUTES=60

# API source
CUSTOM_API_URL=https://api.example.com

# Database
DATABASE_URL=postgresql://user:pass@localhost/releases

# File cache
FILE_CACHE_DIR=./release-cache
```

Then update initialization:

```typescript
// src/data/releaseManager.ts
const dataSources = [];

if (process.env.DATA_SOURCES?.includes("commvault")) {
  dataSources.push(new CommvaultDocSource({...}));
}

if (process.env.DATA_SOURCES?.includes("api")) {
  dataSources.push(new CustomApiSource(
    process.env.CUSTOM_API_URL || ""
  ));
}

if (process.env.DATA_SOURCES?.includes("file")) {
  dataSources.push(new FileSource(
    process.env.FILE_CACHE_DIR || "./release-cache"
  ));
}

// Always include mock as fallback
dataSources.push(new MockDataSource());

const loader = new ReleaseDataLoader(
  dataSources,
  parseInt(process.env.CACHE_TTL_MINUTES || "60")
);
```

---

## Building Your Custom Source

### Template

```typescript
// src/services/myCustomSource.ts
import { DataSource, ReleaseData } from "./types.js";

export class MyCustomSource implements DataSource {
  name = "My Custom Source";
  description = "Custom source description";

  async fetch(version: string): Promise<ReleaseData> {
    // 1. Fetch raw data from source
    // 2. Parse/transform to ReleaseData format
    // 3. Return result or throw error

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
      },
    };
  }
}
```

### Required Categories

All sources must provide these categories (can be empty arrays):

- `Virtualization`
- `Security`
- `Database`
- `Storage`
- `APIs`
- `User Experience`

### Error Handling

Throw descriptive errors:

```typescript
async fetch(version: string): Promise<ReleaseData> {
  if (!this.isSupportedVersion(version)) {
    throw new Error(
      `Version ${version} not supported. Supported: ${this.getSupportedVersions().join(", ")}`
    );
  }

  try {
    // ... fetch logic
  } catch (error) {
    throw new Error(
      `Failed to fetch ${version}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
```

---

## Testing Configuration

### Test Multiple Sources

```bash
# Test mock source
npm run build
node build/index.js &
# Should print: "Loaded from Mock Data"

# Test custom source
# Edit releaseManager.ts to use CustomApiSource
npm run build
# Point to test API server
CUSTOM_API_URL=http://localhost:3000 node build/index.js &
```

### Verify Source Priority

Check logs when server starts:

```
[Startup] Loading release data...
[Loading] 11.44 from Commvault Documentation...
[ERROR] Failed to fetch... (if network down)
[Loading] 11.44 from Mock Data...
[Loaded] 11.44 from Mock Data
```

The first successful source wins!

---

## Debugging

### Check which source is being used

```typescript
const diag = releaseManager.getDiagnostics();
console.log(diag.dataSources); // Shows available sources
```

### Enable detailed logging

Add to `releaseDataLoader.ts`:

```typescript
private async performLoad(version: string, cacheKey: string): Promise<ReleaseData> {
  for (const [sourceName, dataSource] of this.dataSources) {
    try {
      console.error(`[DETAILED] Attempting ${sourceName} for ${version}`);
      console.error(`[DETAILED] Source capabilities: ${dataSource.description}`);
      const data = await dataSource.fetch(version);
      console.error(`[DETAILED] SUCCESS - Got ${Object.keys(data.categories).length} categories`);
      return data;
    } catch (error) {
      console.error(`[DETAILED] FAILED - ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
```

---

## Production Checklist

When deploying to production:

- [ ] Test all configured sources with actual data
- [ ] Verify fallback sources work
- [ ] Set appropriate `CACHE_TTL_MINUTES` (60-1440)
- [ ] Monitor source availability and latency
- [ ] Have a mock fallback configured
- [ ] Document data source deployment
- [ ] Set up alerts for source failures
- [ ] Plan data refresh strategy
- [ ] Backup configuration in version control
