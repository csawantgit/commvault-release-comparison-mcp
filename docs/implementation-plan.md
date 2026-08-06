# Implementation Plan: Real Data from Live Documentation URLs
## 11.44 vs 11.46 Working Demo

---

## 1. LIVE DOCUMENTATION SOURCES (CONFIRMED URLS)

From `src/services/commvaultDocSource.ts`, these URLs are already mapped:

| Version | URL | Release Date |
|---------|-----|--------------|
| **11.44** | https://documentation.commvault.com/commvault/v11/article?p=116842.htm | 2023-04-15 |
| **11.46** | https://documentation.commvault.com/commvault/v11/article?p=139640.htm | 2023-08-20 |

**Current issue:** CommvaultDocSource has these URLs but parsing is incomplete (regex-based, brittle)

**Solution:** Implement version-specific DOM parsers that handle real Commvault HTML structure

---

## 2. REVERSE-ENGINEER LIVE DOCUMENTATION STRUCTURE

### Task 1: Analyze Real HTML
Fetch both URLs and inspect structure:
- Which HTML tags contain release notes? (`<div>`, `<section>`, `<article>`)
- What heading levels mark categories? (`<h2>`, `<h3>`, `<h4>`)
- How are features listed? (`<ul>/<li>`, `<ol>`, `<p>`, tables)
- What semantic markup exists? (Classes, data attributes, IDs)

### Expected Patterns (based on typical Commvault docs)
```html
<!-- Likely structure -->
<h2>Virtualization Enhancements</h2>
<ul>
  <li>Feature title: Description text</li>
  <li>Another feature: More details</li>
</ul>

<h2>Security Improvements</h2>
<ul>
  <li>...</li>
</ul>
```

### Output of Analysis
Create `docs/html-structure-analysis.md`:
- Screenshot of structure for 11.44
- Screenshot of structure for 11.46
- Identified tag patterns for each version
- Differences between versions (if any)

---

## 3. IMPLEMENTATION: RELEASE PARSERS

### 3.1 Create Base Parser Class
**File:** `src/parsers/baseParser.ts`

```typescript
export abstract class BaseParser {
  abstract parse(htmlContent: string): Promise<ParsedRelease>
  
  // Shared utilities
  protected cleanText(text: string): string
  protected extractMainContent(html: string): string
  protected splitByHeadings(html: string): Section[]
}

interface Section {
  heading: string
  level: number  // h2=2, h3=3, etc.
  content: string
  items: string[]
}
```

**Responsibilities:**
- Extract main content (remove navigation, sidebars)
- Split by heading levels
- Extract list items per section
- Clean HTML entities and whitespace

---

### 3.2 Create Version-Specific Parsers

#### **File:** `src/parsers/parser1144.ts`
```typescript
import { BaseParser } from "./baseParser.js"

export class Parser1144 extends BaseParser {
  async parse(htmlContent: string): Promise<ParsedRelease> {
    // 1. Extract main content area (Commvault docs pattern)
    const mainContent = this.extractMainContent(htmlContent)
    
    // 2. Split by h2 headings (assumed pattern for category headers)
    const sections = this.splitByHeadings(mainContent, 2)
    
    // 3. Extract features from each section
    const rawItems: RawReleaseItem[] = []
    for (const section of sections) {
      const sectionTitle = this.cleanText(section.heading)
      const items = this.extractListItems(section.content)
      
      for (const item of items) {
        rawItems.push({
          originalText: item,
          title: this.extractTitle(item),
          description: this.extractDescription(item),
          htmlSection: sectionTitle
        })
      }
    }
    
    return {
      version: "11.44",
      releaseDate: "2023-04-15",
      rawItems
    }
  }
  
  private extractListItems(html: string): string[] {
    // Extract all <li> or text nodes from bullets
    const items: string[] = []
    // Parse and collect
    return items
  }
}
```

#### **File:** `src/parsers/parser1146.ts`
```typescript
import { BaseParser } from "./baseParser.js"

export class Parser1146 extends BaseParser {
  async parse(htmlContent: string): Promise<ParsedRelease> {
    // Same structure as 1144 (versions likely have similar docs format)
    // Adjust heading levels or item extraction if needed
    
    const mainContent = this.extractMainContent(htmlContent)
    const sections = this.splitByHeadings(mainContent, 2)
    
    const rawItems: RawReleaseItem[] = []
    for (const section of sections) {
      // ... same as 1144
    }
    
    return {
      version: "11.46",
      releaseDate: "2023-08-20",
      rawItems
    }
  }
}
```

---

## 4. CATEGORY MAPPER SERVICE

**File:** `src/services/releaseMapper.ts`

Maps raw extracted items to 6 standard categories using keyword matching:

```typescript
export class ReleaseMapper {
  private categoryPatterns: Record<string, RegExp[]> = {
    Virtualization: [
      /vmware|vcenter|vsphere|hyper-v|hyperv|kubernetes|k8s|docker/i,
      /vm backup|virtual machine|hypervisor|kvm|xen|openstack|proxmox/i,
    ],
    Security: [
      /encryption|encrypt|tls|ssl|certificate|auth|authentication/i,
      /ldap|saml|mfa|multi-factor|ransomware|compliance|gdpr|hipaa/i,
    ],
    Database: [
      /oracle|sql server|sqlserver|postgres|postgresql|mysql|mariadb/i,
      /mongodb|nosql|cassandra|hana|db2|sybase|database/i,
    ],
    Storage: [
      /s3|aws|azure|gcs|google cloud|object storage|blob|dedup/i,
      /tape|backup destination|storage pool|storage optimization/i,
    ],
    Platform: [
      /api|rest|graphql|webhook|sdk|integration|command center/i,
      /cli|ui|interface|dashboard|portal|console|platform/i,
    ],
    Performance: [
      /improve|optimize|optimized|faster|faster|performance/i,
      /efficiency|throughput|latency|scalability|reduce|dedup/i,
    ],
  }
  
  map(rawItems: RawReleaseItem[]): Record<string, Change[]> {
    const categorized: Record<string, Change[]> = {
      Virtualization: [],
      Security: [],
      Database: [],
      Storage: [],
      Platform: [],
      Performance: [],
    }
    
    for (const item of rawItems) {
      const category = this.findBestCategory(item.title, item.description)
      categorized[category].push({
        id: `${item.version}-${category.toLowerCase()}-${categorized[category].length + 1}`,
        title: item.title,
        description: item.description,
      })
    }
    
    return categorized
  }
  
  private findBestCategory(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase()
    let bestMatch = "Platform"
    let bestScore = 0
    
    for (const [category, patterns] of Object.entries(this.categoryPatterns)) {
      let score = 0
      for (const pattern of patterns) {
        const matches = text.match(pattern)
        if (matches) score += matches.length
      }
      if (score > bestScore) {
        bestScore = score
        bestMatch = category
      }
    }
    
    return bestMatch
  }
}
```

---

## 5. RELEASE LOADER SERVICE

**File:** `src/services/releaseLoader.ts`

Orchestrates parsing and mapping:

```typescript
import { Parser1144 } from "../parsers/parser1144.js"
import { Parser1146 } from "../parsers/parser1146.js"
import { ReleaseMapper } from "./releaseMapper.js"
import { ReleaseData } from "./types.js"

export class ReleaseLoader {
  private parsers: Record<string, any> = {
    "11.44": new Parser1144(),
    "11.46": new Parser1146(),
  }
  
  private mapper = new ReleaseMapper()
  
  async loadFromHTML(version: string, htmlContent: string): Promise<ReleaseData> {
    const parser = this.parsers[version]
    if (!parser) {
      throw new Error(`No parser for version ${version}`)
    }
    
    // Parse HTML to raw items
    const parsed = await parser.parse(htmlContent)
    
    // Categorize raw items
    const categorizedChanges = this.mapper.map(parsed.rawItems)
    
    // Return standard format
    return {
      version: parsed.version,
      releaseDate: parsed.releaseDate,
      categories: categorizedChanges,
    }
  }
  
  async loadFromURL(version: string, url: string): Promise<ReleaseData> {
    const html = await fetch(url).then(r => r.text())
    return this.loadFromHTML(version, html)
  }
}
```

---

## 6. MODIFY RELEASE MANAGER

**File:** `src/data/releaseManager.ts`

Add method to load from live URLs:

```typescript
async initializeFromLiveURLs(urls: Record<string, string>): Promise<void> {
  const loader = new ReleaseLoader()
  
  for (const [version, url] of Object.entries(urls)) {
    try {
      console.error(`[ReleaseManager] Loading ${version} from live URL...`)
      const data = await loader.loadFromURL(version, url)
      this.releases.set(version, data)
      console.error(`[ReleaseManager] Loaded ${version}: ${Object.keys(data.categories).length} categories`)
    } catch (error) {
      console.error(`[ReleaseManager] Failed to load ${version}: ${error}`)
    }
  }
  
  this.initialized = true
}
```

---

## 7. MODIFY SERVER ENTRY POINT

**File:** `src/index.ts`

Replace mock initialization with live URLs:

```typescript
// Before:
// await releaseManager.initialize(["11.44", "11.46"])

// After:
const liveURLs = {
  "11.44": "https://documentation.commvault.com/commvault/v11/article?p=116842.htm",
  "11.46": "https://documentation.commvault.com/commvault/v11/article?p=139640.htm",
}

await releaseManager.initializeFromLiveURLs(liveURLs)
```

---

## 8. IMPLEMENTATION TASKS (IN ORDER)

### Task 1: Analyze Live Documentation (1-2 hours)
**Goal:** Understand real HTML structure

1. Fetch both URLs (can do via curl or browser)
2. Save HTML to temp files
3. Inspect structure:
   - Find main content container
   - Identify section headers (category markers)
   - Identify feature lists
   - Note any version-specific differences
4. Document findings in `docs/html-structure-analysis.md`

**Success:** Can describe how to reliably extract categories and features from each version

---

### Task 2: Implement BaseParser (1-2 hours)
**Goal:** Reusable utilities for HTML extraction

1. Create `src/parsers/baseParser.ts`
2. Implement:
   - `extractMainContent()` — Remove nav, sidebars, footers
   - `splitByHeadings()` — Group content by h2/h3
   - `extractListItems()` — Parse `<li>` or bullet points
   - `cleanText()` — Remove HTML entities, extra whitespace
3. Test with sample HTML from live docs

**Success:** Can parse sample HTML sections into structured data

---

### Task 3: Implement Parser1144 & Parser1146 (2-3 hours)
**Goal:** Extract features from 11.44 and 11.46 docs

1. Create `src/parsers/parser1144.ts`
   - Extend BaseParser
   - Implement `parse()` method
   - Test against live documentation
2. Create `src/parsers/parser1146.ts`
   - Mirror 1144 (same structure likely)
   - Adjust if version has different HTML format

**Success:** Can extract 20+ raw items per version with titles and descriptions

---

### Task 4: Implement ReleaseMapper (1 hour)
**Goal:** Categorize features into 6 standard categories

1. Create `src/services/releaseMapper.ts`
2. Define keyword patterns for each category
3. Implement `map()` method
4. Test mapping on extracted items

**Success:** 80%+ of items correctly categorized to Virtualization, Security, Database, Storage, Platform, or Performance

---

### Task 5: Implement ReleaseLoader (1-2 hours)
**Goal:** Orchestrate parsing and mapping

1. Create `src/services/releaseLoader.ts`
2. Register parsers for both versions
3. Implement `loadFromURL()` to fetch and parse
4. Test end-to-end

**Success:** `ReleaseLoader.loadFromURL(version, url)` returns ReleaseData with categories

---

### Task 6: Integrate into ReleaseManager (1 hour)
**Goal:** Wire ReleaseLoader into existing architecture

1. Modify `src/data/releaseManager.ts`
2. Add `initializeFromLiveURLs()` method
3. Load from actual Commvault documentation URLs

**Success:** ReleaseManager loads data from live documentation, not mock

---

### Task 7: Update Server Entry Point (30 minutes)
**Goal:** Start with real data

1. Modify `src/index.ts`
2. Replace mock initialization with live URLs
3. Test that MCP server starts with real data

**Success:** Server starts, loads real data, MCP tools return live documentation data

---

### Task 8: Test Complete Flow (1-2 hours)
**Goal:** Verify working demo

1. Start server with real data
2. Test `compare_releases("11.44", "11.46")` — shows differences
3. Test `get_release_changes("11.44")` — shows all features
4. Test `generate_summary("11.46", "markdown")` — produces readable output
5. Verify all 6 categories populated

**Success:** Demo works: can compare 11.44 vs 11.46 using real Commvault documentation

---

## 9. TOTAL EFFORT ESTIMATE

| Task | Hours | Notes |
|------|-------|-------|
| 1. Analyze live docs | 1-2 | Critical to get parsing right |
| 2. BaseParser | 1-2 | Shared utilities |
| 3. Parsers 1144/1146 | 2-3 | Version-specific extraction |
| 4. ReleaseMapper | 1 | Category assignment |
| 5. ReleaseLoader | 1-2 | Orchestration |
| 6. Integrate ReleaseManager | 1 | Wire into existing system |
| 7. Update entry point | 0.5 | Minimal change |
| 8. Test full flow | 1-2 | Validation and debugging |
| **TOTAL** | **8-15 hours** | **MVP working demo** |

**Fastest path (8 hours):** Focus on core parsing, minimal error handling
**Safe path (12-15 hours):** Robust parsing, good error messages, comprehensive testing

---

## 10. DELIVERABLES

### MVP Success Criteria
- ✅ Fetch from live Commvault URLs (11.44, 11.46)
- ✅ Extract 20+ features per version
- ✅ Categorize into 6 standard categories
- ✅ `compare_releases("11.44", "11.46")` shows real differences
- ✅ `generate_summary()` produces readable changelog
- ✅ Zero hardcoded mock data in code paths
- ✅ All MCP tools work with real data

### Artifacts
- `src/parsers/baseParser.ts` — Shared utilities
- `src/parsers/parser1144.ts` — 11.44 parser
- `src/parsers/parser1146.ts` — 11.46 parser
- `src/services/releaseLoader.ts` — Loader orchestrator
- `src/services/releaseMapper.ts` — Category mapping
- `docs/html-structure-analysis.md` — Analysis of live docs
- Updated `src/index.ts` — Entry point with live URLs
- Updated `src/data/releaseManager.ts` — New load method

---

## 11. RISK MITIGATION

| Risk | Mitigation |
|------|-----------|
| **URLs change or docs restructured** | Implement fallback to mock data; add version detection in parser |
| **HTML structure varies between versions** | Version-specific parsers (already planned) |
| **Feature extraction misses items** | Keyword-based verification; manual audit of output |
| **Categorization inaccuracy** | Adjustable patterns; manual override support |
| **Performance (fetching from web)** | Cache results (already in ReleaseDataLoader) |

---

## 12. SUCCESS VALIDATION

After implementation, run:

```bash
npm run build
npm run start
```

Then test via Claude:
```
Compare Commvault 11.44 vs 11.46 release features
```

Expected response: Real features from live documentation, organized by category.

