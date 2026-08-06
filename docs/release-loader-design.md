# Release-Loader Service Design
## Real Commvault Documentation Integration

---

## 1. CURRENT ARCHITECTURE ANALYSIS

### Hardcoded Data Location
**Primary location:** `src/services/mockDataSource.ts` (366 lines)
- Contains hand-written mock data for versions 11.44 and 11.46
- 6 categories: Virtualization, Security, Database, Storage, APIs, User Experience
- ~50 total features across both versions
- Used as fallback when CommvaultDocSource fails

### Data Flow (Current)
```
ReleaseManager.initialize()
    ↓
ReleaseDataLoader.loadReleases(["11.44", "11.46"])
    ↓
Tries: CommvaultDocSource.fetch(version)
    ↓
On failure: Falls back to MockDataSource.fetch(version)
    ↓
Stores in ReleaseManager.releases Map
    ↓
Served via MCP tools (compare_releases, get_release_changes, etc.)
```

### Key Classes
- **ReleaseManager** (`src/data/releaseManager.ts`) — Singleton, orchestrates loading
- **ReleaseDataLoader** (`src/services/releaseDataLoader.ts`) — Tries multiple sources with fallback
- **CommvaultDocSource** (`src/services/commvaultDocSource.ts`) — Has URLs but placeholder parsing
- **MockDataSource** (`src/services/mockDataSource.ts`) — Hardcoded data (to be replaced)

---

## 2. PROPOSED SOLUTION: RELEASE-LOADER SERVICE

### High-Level Approach
Create a new **ReleaseLoader** service that:
1. **Reads** provided Commvault release page HTML (from user or file)
2. **Parses** version-specific HTML structures
3. **Extracts** feature items and descriptions
4. **Categorizes** items into 6 standard categories
5. **Normalizes** into ReleaseData format
6. **Provides** to ReleaseManager

### Why Not a Generic Scraper?
- Commvault documentation HTML changes between versions
- Each version (2023E, 2024E, 11.42, 11.44, 11.46) has different structure
- Brittle regex/DOM patterns would require constant maintenance
- **Better approach:** Version-specific parsers with consistent output

### Target Categories
Map release items into:
1. **Virtualization** — VMware, Hyper-V, Kubernetes, cloud platforms
2. **Security** — Encryption, authentication, compliance, ransomware protection
3. **Database** — Oracle, SQL Server, PostgreSQL, MySQL, NoSQL
4. **Storage** — S3, Azure, GCS, object storage, deduplication
5. **Platform** — Core infrastructure, APIs, integrations
6. **Performance** — Optimization, efficiency, resource improvements

---

## 3. DETAILED SERVICE DESIGN

### 3.1 New Service: ReleaseLoader

**File:** `src/services/releaseLoader.ts`

```typescript
// Pseudo-code structure
export class ReleaseLoader {
  // Version-specific parsers (one per Commvault version)
  private parsers: Map<string, VersionParser>
  
  constructor() {
    this.parsers.set("2023e", new Parser2023E())
    this.parsers.set("2024e", new Parser2024E())
    this.parsers.set("11.42", new Parser1142())
    this.parsers.set("11.44", new Parser1144())
    this.parsers.set("11.46", new Parser1146())
  }
  
  async loadFromHTML(version: string, htmlContent: string): Promise<ReleaseData>
  async loadFromFile(version: string, filePath: string): Promise<ReleaseData>
}

// Each version parser implements this interface
interface VersionParser {
  parse(htmlContent: string): Promise<ParsedRelease>
}

// Normalized output
interface ParsedRelease {
  version: string
  releaseDate: string
  rawItems: RawReleaseItem[]  // Pre-categorization
}

interface RawReleaseItem {
  originalText: string
  title: string
  description: string
  htmlSection: string  // Which <h2>, <h3> it came from
}
```

### 3.2 Categorizer Service

**File:** `src/services/categorizer.ts`

```typescript
// Maps extracted items to standard categories
export class ReleaseCategorizer {
  // Keyword patterns for each category
  private categoryPatterns: Record<string, RegExp[]> = {
    Virtualization: [/vmware|hyper-v|kubernetes|k8s|vm|docker|container|proxmox|openstack/i, ...],
    Security: [/encryption|tls|ssl|auth|ldap|mfa|ransomware|compliance/i, ...],
    Database: [/oracle|sql server|postgres|mysql|mongodb|mariadb|sap hana/i, ...],
    Storage: [/s3|azure|gcs|object storage|dedup|tape|backup destination/i, ...],
    Platform: [/api|rest|webhook|integration|cli|ui|command center/i, ...],
    Performance: [/improve|optimize|faster|efficient|reduce|throughput|latency/i, ...],
  }
  
  categorizeItem(item: RawReleaseItem): string[]  // Returns [primary, secondary?]
  categorizeBatch(items: RawReleaseItem[]): Record<string, Change[]>
}
```

### 3.3 Data Flow With ReleaseLoader

```
Commvault Release Page HTML (provided by user)
    ↓
ReleaseLoader.loadFromHTML(version, html)
    ↓
Version-specific Parser (e.g., Parser2024E)
    ├→ Extract <h2> sections (e.g., "New Features", "Enhancements")
    ├→ Extract <ul>/<li> or <p> items
    └→ Create RawReleaseItem[] with title + description
    ↓
ReleaseCategorizer.categorizeBatch(items)
    ├→ Match keywords against category patterns
    ├→ Assign primary category (highest confidence)
    └→ Create Change[] with IDs (version-category-index)
    ↓
ReleaseManager.addRelease(version, ReleaseData)
    ↓
MCP tools serve comparison/summaries
```

---

## 4. FILES TO CREATE

### New Files
```
src/services/releaseLoader.ts          # Main loader service
src/services/categorizer.ts            # Category assignment logic
src/parsers/parser2023e.ts            # 2023E version parser
src/parsers/parser2024e.ts            # 2024E version parser
src/parsers/parser1142.ts             # 11.42 version parser
src/parsers/parser1144.ts             # 11.44 version parser
src/parsers/parser1146.ts             # 11.46 version parser
src/parsers/baseParser.ts             # Shared parsing utilities
src/data/releaseHTMLData.ts           # Store HTML content (development)
tests/releaseLoader.test.ts           # Unit tests
```

### Data Storage (Development)
For the MVP, store raw HTML in TypeScript:
```typescript
// src/data/releaseHTMLData.ts
export const releaseHTMLPages: Record<string, string> = {
  "2023e": `<html>...</html>`,  // Copy/paste from Commvault docs
  "2024e": `<html>...</html>`,
  "11.42": `<html>...</html>`,
  "11.44": `<html>...</html>`,
  "11.46": `<html>...</html>`,
}
```

**Rationale:**
- No network calls during demo
- No authentication/scraping issues
- Easy to test and iterate
- Can be replaced with real fetching later

---

## 5. FILES TO MODIFY

### 1. `src/services/types.ts`
**Add:** RawReleaseItem interface

### 2. `src/data/releaseManager.ts`
**Modify:** Add method to load from ReleaseLoader
```typescript
async loadFromReleaseLoader(
  version: string, 
  htmlContent: string
): Promise<ReleaseData>
```

### 3. `src/index.ts` (Main entry point)
**Modify:** Initialize with real release data instead of mock
```typescript
// Before: releaseManager.initialize(["11.44", "11.46"])
// After:
const versions = ["2023e", "2024e", "11.42", "11.44", "11.46"]
for (const version of versions) {
  const html = releaseHTMLPages[version]
  const data = await releaseLoader.loadFromHTML(version, html)
  releaseManager.addRelease(version, data)
}
```

### 4. `src/services/releaseDataLoader.ts`
**Modify:** Add ReleaseLoader as primary data source (before CommvaultDocSource)
```typescript
const dataSources = [
  new ReleaseLoader(),  // Try real data first
  new CommvaultDocSource(...),  // Fall back to fetching
  new MockDataSource(),  // Final fallback
]
```

### 5. `package.json`
**Add:** cheerio or similar (optional, for robust HTML parsing)
```json
"dependencies": {
  "cheerio": "^1.0.0"  // For robust DOM parsing if needed
}
```

---

## 6. IMPLEMENTATION STRATEGY: MINIMAL MVP

### Phase 1: Parser for One Version (2-3 hours)
1. **Input:** Commvault 2024E release page HTML (provided by user)
2. **Task:** 
   - Create `Parser2024E` class
   - Extract features from HTML structure
   - Create `ReleaseLoader` that calls parser
   - Store HTML in `releaseHTMLData.ts`
3. **Verify:** Can extract 20+ features with titles/descriptions

### Phase 2: Categorization (1-2 hours)
1. **Create** `ReleaseCategorizer` with keyword patterns
2. **Categorize** extracted features into 6 categories
3. **Verify:** 80%+ accuracy on feature assignments
4. **Fallback:** Manual category overrides for ambiguous items

### Phase 3: Integration (1-2 hours)
1. **Modify** `ReleaseManager` to load via ReleaseLoader
2. **Update** `index.ts` entry point
3. **Remove** MockDataSource dependency
4. **Test:** MCP tools work with real data

### Phase 4: Expand to All 5 Versions (2-3 hours)
1. Copy Parser2024E → Parser2023E, Parser1144, etc.
2. Adjust parsing logic per version (minor tweaks)
3. Add all 5 versions to releaseHTMLData.ts
4. Test compare_releases across versions

**Total MVP: 6-10 hours**

---

## 7. DATA TRANSFORMATION EXAMPLE

### Input (Raw HTML)
```html
<h2>Virtualization</h2>
<ul>
  <li>Enhanced Kubernetes support with improved cluster discovery</li>
  <li>VMware Live Migration optimizations for vSphere 8.0</li>
</ul>

<h2>Security</h2>
<ul>
  <li>AES-256-GCM encryption across all data channels</li>
</ul>
```

### After Parser2024E.parse()
```typescript
{
  version: "2024e",
  releaseDate: "2024-01-15",
  rawItems: [
    {
      originalText: "Enhanced Kubernetes support with improved cluster discovery",
      title: "Enhanced Kubernetes Support",
      description: "Improved cluster discovery and namespace management",
      htmlSection: "Virtualization"
    },
    // ... more items
  ]
}
```

### After ReleaseCategorizer.categorizeBatch()
```typescript
{
  Virtualization: [
    {
      id: "2024e-virt-001",
      title: "Enhanced Kubernetes Support",
      description: "Improved cluster discovery and namespace management"
    },
    {
      id: "2024e-virt-002",
      title: "VMware Live Migration Optimizations",
      description: "vSphere 8.0 support with reduced RTO"
    }
  ],
  Security: [
    {
      id: "2024e-sec-001",
      title: "AES-256-GCM Encryption",
      description: "Across all data channels"
    }
  ],
  // ... other categories
}
```

### Returned to MCP Tools
```typescript
{
  version: "2024e",
  releaseDate: "2024-01-15",
  categories: {
    Virtualization: [{ id, title, description }, ...],
    Security: [{ id, title, description }, ...],
    // ...
  }
}
```

---

## 8. KEY DESIGN DECISIONS

| Decision | Why |
|----------|-----|
| Version-specific parsers | Different HTML structures per version |
| ReleaseCategorizer separate | Reusable for future data sources |
| Store HTML in TypeScript | No network/auth issues for MVP |
| Keyword-based categorization | Fast, deterministic, no ML overhead |
| Manual overrides possible | Handle edge cases (items fitting multiple categories) |
| ReleaseLoader as primary source | Prioritizes real data over mock |

---

## 9. SUCCESS CRITERIA FOR MVP

- ✅ Extract 20+ features from 2024E release page
- ✅ Correctly categorize 80%+ into 6 categories
- ✅ ReleaseManager.initialize() loads real data (not mock)
- ✅ compare_releases("2024e", "11.46") works
- ✅ generate_summary("2024e") produces readable output
- ✅ All 5 versions available via MCP tools
- ✅ No mock data in production code paths

---

## 10. PSEUDO-CODE: START HERE

### Release Parser Template
```typescript
// src/parsers/parser2024e.ts
export class Parser2024E implements VersionParser {
  async parse(html: string): Promise<ParsedRelease> {
    // 1. Extract release date from <meta> or hardcode
    const releaseDate = "2024-01-15"
    
    // 2. Find all major sections (h2/h3 headers)
    const sections = this.extractSections(html)
    // sections = [
    //   { heading: "New Features", items: ["item 1", "item 2", ...] },
    //   { heading: "Enhancements", items: [...] },
    // ]
    
    // 3. Flatten into raw items with titles/descriptions
    const rawItems: RawReleaseItem[] = []
    for (const section of sections) {
      for (const item of section.items) {
        rawItems.push({
          originalText: item,
          title: this.extractTitle(item),
          description: this.extractDescription(item),
          htmlSection: section.heading
        })
      }
    }
    
    return {
      version: "2024e",
      releaseDate,
      rawItems
    }
  }
  
  private extractSections(html: string): Section[] {
    // Use regex or cheerio to find <h2>/<h3> and following <ul>
    // Return structured sections
  }
  
  private extractTitle(item: string): string {
    // First sentence or first line
  }
  
  private extractDescription(item: string): string {
    // Rest of text, cleaned
  }
}
```

### Categorizer Template
```typescript
// src/services/categorizer.ts
export class ReleaseCategorizer {
  categorizeBatch(items: RawReleaseItem[]): Record<string, Change[]> {
    const result: Record<string, Change[]> = {
      Virtualization: [],
      Security: [],
      Database: [],
      Storage: [],
      Platform: [],
      Performance: [],
    }
    
    for (const item of items) {
      const category = this.findBestCategory(item.title, item.description)
      result[category].push({
        id: `${item.version}-${category.toLowerCase()}-${result[category].length + 1}`,
        title: item.title,
        description: item.description,
      })
    }
    
    return result
  }
  
  private findBestCategory(title: string, description: string): string {
    const text = (title + " " + description).toLowerCase()
    let bestCategory = "Platform"
    let bestScore = 0
    
    for (const [category, patterns] of Object.entries(this.categoryPatterns)) {
      for (const pattern of patterns) {
        const matches = (text.match(pattern) || []).length
        if (matches > bestScore) {
          bestScore = matches
          bestCategory = category
        }
      }
    }
    
    return bestCategory
  }
}
```

---

## 11. NEXT STEPS (USER ACTION)

Before I start coding, I need:

1. **Commvault Release Page HTML** for at least one version (e.g., 2024E)
   - Paste raw HTML or provide file path
   - Or: Confirm you want me to use placeholder HTML for MVP demo

2. **Confirm Category List**
   - Virtualization, Security, Database, Storage, Platform, Performance ✓
   - Or: Adjust/rename categories?

3. **Version Priority**
   - Start with 2024E? Or another version?
   - Then expand to all 5?

Once I have HTML samples, I can create working parsers.

