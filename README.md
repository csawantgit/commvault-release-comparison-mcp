# Commvault Release Comparison MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to compare Commvault release versions and analyze product changes across functional areas.

## Problem Statement

Commvault customers and administrators face a significant challenge when planning product upgrades:

- **Fragmented Information**: Release details are scattered across multiple documentation pages and release notes
- **Information Overload**: Large volumes of release notes make it difficult to identify changes relevant to specific needs
- **Category Blindness**: Users struggle to understand how changes impact particular functional areas such as Virtualization, Security, Storage, Databases, and APIs
- **Time-Consuming Analysis**: Manual review of multiple versions is labor-intensive and error-prone

This fragmentation increases the time and effort required to make informed decisions about upgrade timing and planning.

## Solution Overview

The Commvault Release Comparison MCP Server bridges this gap by providing intelligent tools for exploring and comparing release information. It enables:

- **Quick Comparisons**: Compare two release versions side-by-side with categorized change summaries
- **Targeted Queries**: Retrieve changes specific to functional areas of interest
- **Version Analysis**: View all changes for a specific release, optionally filtered by category
- **Human-Readable Summaries**: Generate formatted release summaries in multiple output formats
- **AI-Powered Integration**: Leverage Claude and other AI assistants to answer questions about Commvault releases

By exposing release data through MCP tools, customers can integrate release comparison capabilities directly into their AI workflows, enabling faster, more informed decision-making.

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────┐
│         Claude/AI Assistant                         │
└────────────────┬────────────────────────────────────┘
                 │ MCP Protocol (stdio)
┌────────────────▼──────────────────────────────────┐
│    Commvault Release Comparison MCP Server        │
├───────────────────────────────────────────────────┤
│                                                   │
│  ┌─────────────────────┐  ┌──────────────────┐  │
│  │   Tool Router       │  │  Tool Handlers   │  │
│  │                     │  │                  │  │
│  │ - compare_releases  │─▶│ - Compare Logic  │  │
│  │ - get_release_...   │  │ - Query Logic    │  │
│  │ - get_category_...  │  │ - Format Logic   │  │
│  │ - generate_summary  │  │                  │  │
│  └─────────────────────┘  └──────────────────┘  │
│           │                       │              │
│  ┌────────▼────────────────────────▼──────────┐  │
│  │         Release Manager (Singleton)        │  │
│  │  - Coordinates data loading                │  │
│  │  - Manages caching with TTL                │  │
│  │  - Handles multiple data sources           │  │
│  └────────┬─────────────────────────────────┬┘  │
│           │                                 │    │
│  ┌────────▼────────┐  ┌─────────────────┐  │    │
│  │  Release Data   │  │  Cache Manager  │  │    │
│  │  Loader         │  │                 │  │    │
│  │                 │  │  - In-memory    │  │    │
│  │  - Multi-source │  │  - TTL-based    │  │    │
│  │    fallback     │  │  - Expiration   │  │    │
│  │  - Dedup        │  │                 │  │    │
│  │    concurrent   │  └─────────────────┘  │    │
│  │    requests     │                       │    │
│  └──────┬──────────┘                       │    │
│         │                                  │    │
│  ┌──────┴──────────────────────────────────┴──┐ │
│  │  Data Sources (pluggable)                 │ │
│  │                                           │ │
│  │  1. Commvault Documentation Source       │ │
│  │     - Fetches from commvault.com         │ │
│  │     - Supports versions 11.44, 11.46+   │ │
│  │                                           │ │
│  │  2. Mock Data Source (Fallback)          │ │
│  │     - Provides test data                 │ │
│  │     - v11.44, v11.46 included            │ │
│  │                                           │ │
│  │  3. Custom Sources (extensible)          │ │
│  │     - Database, API, File sources        │ │
│  │     - Implement DataSource interface     │ │
│  └───────────────────────────────────────────┘ │
│                                                   │
└───────────────────────────────────────────────────┘
```

### Data Loading Architecture

The system uses a **dynamic, multi-source data loading approach**:

1. **Initialization**: On startup, `ReleaseManager` loads specified versions
2. **Data Sources**: Tries sources in order (Commvault docs → Mock data)
3. **Automatic Fallback**: If web source fails, automatically uses mock data
4. **Intelligent Caching**: Results cached with TTL to avoid repeated fetches
5. **On-Demand Loading**: Versions loaded on first access if not preloaded

See `docs/data-loading.md` for complete architecture details.

### Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.0+
- **Protocol**: Model Context Protocol (MCP) v1.0.0
- **Build Tool**: TypeScript Compiler (tsc)

### Project Structure

```
commvault-release-comparison-mcp/
├── src/
│   ├── index.ts                      # Main MCP server implementation
│   ├── data/
│   │   ├── releases.ts               # Type definitions and exports
│   │   └── releaseManager.ts         # Release data coordinator
│   └── services/
│       ├── types.ts                  # Shared data source interfaces
│       ├── cacheManager.ts           # TTL-based cache implementation
│       ├── releaseDataLoader.ts      # Multi-source loader orchestrator
│       ├── commvaultDocSource.ts     # Fetches from Commvault docs
│       └── mockDataSource.ts         # Fallback test data
├── build/                            # Compiled JavaScript output
├── docs/
│   ├── project-plan.md               # Original project planning
│   ├── data-loading.md               # Data loading architecture (NEW)
│   ├── data-sources-config.md        # Configuration guide (NEW)
│   └── DATA-LOADING-SUMMARY.md       # Implementation summary (NEW)
├── examples/
│   └── test-data-loading.mjs         # Data loading test suite (NEW)
├── package.json                      # Dependencies and metadata
├── tsconfig.json                     # TypeScript configuration
├── README.md                         # This file
└── LICENSE                           # MIT License
```

### Services Overview

#### Data Loading Services
- **ReleaseManager** - Singleton coordinator for all data operations
- **ReleaseDataLoader** - Manages multiple data sources with fallback
- **CacheManager** - In-memory cache with TTL expiration

#### Data Sources
- **CommvaultDocSource** - Fetches from official Commvault documentation
- **MockDataSource** - Provides test data for v11.44 and v11.46
- **Custom Sources** - Extensible architecture for custom implementations

## MCP Tools

### 1. compare_releases

Compare two Commvault release versions and view categorized differences.

**Parameters:**
- `version1` (string, required): First version to compare
  - Available versions: Check server output for current list
- `version2` (string, required): Second version to compare
  - Available versions: Check server output for current list

**Returns:**
- `version1` / `version2`: Version strings compared
- `release_date_v1` / `release_date_v2`: Release dates for each version
- `category_comparison`: Object with category-wise metrics
  - `version1_count`: Change count in first version
  - `version2_count`: Change count in second version
  - `new_in_v2`: List of features new in second version

**Use Cases:**
- Planning upgrade paths
- Understanding feature additions between versions
- Assessing compatibility impacts

---

### 2. get_release_changes

Retrieve all changes for a specific Commvault release, optionally filtered by category.

**Parameters:**
- `version` (string, required): Release version to query
- `category` (string, optional): Filter by functional category
  - Available categories: Virtualization, Security, Database, Storage, APIs, User Experience

**Returns:**
- `version`: Release version queried
- `release_date`: When the release was published
- `category` (if filtered): The specific category requested
- `changes`: Array of change objects with title and description
- `total`: Count of changes returned

**Use Cases:**
- Identifying all changes in a specific release
- Finding changes related to a specific product area
- Generating release notes for internal teams

---

### 3. get_category_changes

Retrieve changes for a functional category across multiple releases.

**Parameters:**
- `category` (string, required): Functional category to retrieve
  - Available categories: Virtualization, Security, Database, Storage, APIs, User Experience
- `start_version` (string, optional): Filter from this version onward
- `end_version` (string, optional): Filter through this version

**Returns:**
- `category`: The category queried
- `total_changes`: Total count across all matching releases
- `changes_by_version`: Object mapping versions to their changes in this category
- `versions_filtered`: Boolean indicating if version range was applied

**Use Cases:**
- Tracking evolution of a feature area over time
- Understanding security enhancements across versions
- Planning API migration strategies

---

### 4. generate_summary

Generate a human-readable summary for a release in multiple formats.

**Parameters:**
- `version` (string, required): Release version to summarize
- `format` (string, optional, default: "markdown"): Output format
  - Valid values: "markdown", "html", "plaintext"
- `include_metrics` (boolean, optional, default: true): Include change statistics

**Returns:**
- `version`: Release version
- `release_date`: Publication date
- `format`: Requested format
- `content`: Formatted summary text
- `metrics` (if included):
  - Per-category change counts
  - Total change count

**Use Cases:**
- Creating release announcement content
- Generating documentation
- Providing summaries in chat interfaces

---

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- 50 MB disk space for dependencies and build artifacts

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/commvault-release-comparison-mcp.git
   cd commvault-release-comparison-mcp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```
   
   This compiles TypeScript to JavaScript in the `build/` directory.

4. **Verify the build**
   ```bash
   ls -la build/
   ```
   
   You should see `index.js` and subdirectories for `data/` and `services/`.

### Development Setup

For active development with auto-recompilation:

```bash
npm run watch
```

This starts the TypeScript compiler in watch mode. Changes to source files will automatically trigger recompilation.

### Testing Data Loading

Verify the data loading service works correctly:

```bash
npm run build
node examples/test-data-loading.mjs
```

This runs a comprehensive test suite covering:
- Release loading and caching
- Version comparison
- Data source fallback
- Diagnostic information

## Local Registration with Claude

### Option 1: Via Claude Code Settings (Recommended)

1. Open Claude Code (CLI or IDE extension)

2. Create or update `.claude/settings.json`:
   ```json
   {
     "mcpServers": {
       "commvault-release-comparison": {
         "type": "stdio",
         "command": "node",
         "args": ["/path/to/commvault-release-comparison-mcp/build/index.js"],
         "disabled": false
       }
     }
   }
   ```

3. Replace `/path/to/` with the actual absolute path to your installation.

4. Restart Claude Code to load the server.

### Option 2: Via Claude Web Interface

If using Claude at claude.ai:

1. Navigate to your account settings
2. Find the "MCP Servers" or "Extensions" section
3. Add a new server with:
   - **Name**: `commvault-release-comparison`
   - **Type**: `stdio`
   - **Command**: `node`
   - **Arguments**: `["/path/to/build/index.js"]`
4. Save and refresh

### Option 3: Using the CLI

If you have the Claude CLI installed:

```bash
claude mcp add commvault-release-comparison \
  --type stdio \
  --command node \
  --args '"/path/to/commvault-release-comparison-mcp/build/index.js"'
```

### Verification

Test that the server is registered:

```bash
# Start the server directly to verify it launches
node build/index.js &

# In another terminal, you can check if it's running
# The server should print: "Commvault Release Comparison MCP Server started"
```

If using Claude Code, simply try calling a tool in your chat and Claude should offer auto-complete for available tools.

## Example Tool Calls

### Example 1: Compare Two Releases

**User Query:**
> "What changed between version 14.0 and 15.0?"

**Tool Call:**
```json
{
  "name": "compare_releases",
  "arguments": {
    "version1": "14.0",
    "version2": "15.0"
  }
}
```

**Sample Response:**
```json
{
  "version1": "14.0",
  "version2": "15.0",
  "release_date_v1": "2024-01-15",
  "release_date_v2": "2024-06-20",
  "category_comparison": {
    "Virtualization": {
      "version1_count": 5,
      "version2_count": 8,
      "new_in_v2": [
        "Enhanced Kubernetes support",
        "Improved VM cloning"
      ]
    },
    "Security": {
      "version1_count": 3,
      "version2_count": 5,
      "new_in_v2": [
        "Multi-factor authentication enhancements"
      ]
    }
  }
}
```

---

### Example 2: Get Release Changes by Category

**User Query:**
> "What security improvements are in version 15.0?"

**Tool Call:**
```json
{
  "name": "get_release_changes",
  "arguments": {
    "version": "15.0",
    "category": "Security"
  }
}
```

**Sample Response:**
```json
{
  "version": "15.0",
  "release_date": "2024-06-20",
  "category": "Security",
  "changes": [
    {
      "id": "sec-001",
      "title": "Multi-factor authentication enhancements",
      "description": "Support for FIDO2 keys and improved SMS delivery"
    },
    {
      "id": "sec-002",
      "title": "Enhanced encryption algorithms",
      "description": "Support for AES-256-GCM across all data flows"
    },
    {
      "id": "sec-003",
      "title": "API token rotation",
      "description": "Automatic and manual token rotation policies"
    },
    {
      "id": "sec-004",
      "title": "Audit logging improvements",
      "description": "Detailed logging of all administrative actions"
    },
    {
      "id": "sec-005",
      "title": "RBAC enhancements",
      "description": "Fine-grained role-based access controls"
    }
  ],
  "total": 5
}
```

---

### Example 3: View Category Evolution

**User Query:**
> "Show me how virtualization features have evolved across the last few releases."

**Tool Call:**
```json
{
  "name": "get_category_changes",
  "arguments": {
    "category": "Virtualization"
  }
}
```

**Sample Response:**
```json
{
  "category": "Virtualization",
  "total_changes": 18,
  "changes_by_version": {
    "13.0": [
      {
        "id": "virt-001",
        "title": "VMware 7.0 support",
        "description": "Full support for VMware vSphere 7.0"
      },
      {
        "id": "virt-002",
        "title": "Hyper-V Live Migration",
        "description": "Improved live migration handling"
      }
    ],
    "14.0": [
      {
        "id": "virt-003",
        "title": "Kubernetes integration",
        "description": "Native Kubernetes cluster backup and recovery"
      }
    ],
    "15.0": [
      {
        "id": "virt-004",
        "title": "OpenStack support",
        "description": "OpenStack cloud platform integration"
      }
    ]
  },
  "versions_filtered": false
}
```

---

### Example 4: Generate Formatted Summary

**User Query:**
> "Generate a markdown summary of version 15.0 with statistics."

**Tool Call:**
```json
{
  "name": "generate_summary",
  "arguments": {
    "version": "15.0",
    "format": "markdown",
    "include_metrics": true
  }
}
```

**Sample Response:**
```json
{
  "version": "15.0",
  "release_date": "2024-06-20",
  "format": "markdown",
  "content": "# Commvault 15.0 Release\n\n**Release Date**: 2024-06-20\n\n## Summary\nRelease 15.0 includes 24 major enhancements across virtualization, security, database, and storage categories.\n\n## Changes by Category\n\n### Virtualization\n- **Enhanced Kubernetes support**: Expanded container orchestration capabilities\n- **Improved VM cloning**: Faster and more reliable VM replication\n\n### Security\n- **Multi-factor authentication enhancements**: Support for FIDO2 keys\n- **Enhanced encryption algorithms**: AES-256-GCM support\n\n### Database\n- **Oracle 21c support**: Latest Oracle database compatibility\n- **MongoDB backup enhancements**: Improved backup consistency\n\n### Storage\n- **Object storage integration**: S3-compatible storage support\n- **Deduplication improvements**: 30% better compression ratios\n\n## Statistics\n- Virtualization: 8 enhancements\n- Security: 5 enhancements\n- Database: 6 enhancements\n- Storage: 5 enhancements\n- **Total**: 24 enhancements",
  "metrics": {
    "virtualization": 8,
    "security": 5,
    "database": 6,
    "storage": 5,
    "total": 24
  }
}
```

---

## Future Enhancements

### Phase 2: Expanded Data Loading (IN PROGRESS)

- ✅ **Dynamic Release Data**: Now loads from Commvault documentation with fallback
- ✅ **Multi-Source Support**: Pluggable architecture for custom data sources
- ✅ **Intelligent Caching**: TTL-based cache with automatic expiration
- ✅ **Automatic Fallback**: Falls back to mock data if web sources fail
- 🔄 **Database Backend**: Persist loaded data to PostgreSQL/MongoDB
- 🔄 **Version Discovery**: Auto-detect available versions from sources
- 🔄 **Custom Parsers**: Support for different documentation formats

### Phase 3: Data and Features

- **Search Functionality**: Full-text search across all release notes
- **Deprecation Tracking**: Identify deprecated features and migration paths
- **Performance Impact Analysis**: Compare performance changes between versions
- **Breaking Changes Detection**: Highlight incompatible changes between versions

### Phase 3: Advanced Analytics

- **Trend Analysis**: Identify areas of focus in recent releases (security, performance, etc.)
- **Feature Roadmap Insights**: Predict upcoming features based on development patterns
- **Impact Assessment**: Estimate organizational impact of specific changes
- **Compatibility Checker**: Verify if current environment supports target release

### Phase 4: Integration and Distribution

- **MCPB Distribution**: Bundle as .mcpb file for easy installation
- **Claude Code Marketplace**: List on official MCP server registry
- **Slack Integration**: Expose as Slack bot for team collaboration
- **Documentation Website**: Dedicated site for accessing release information
- **API Endpoint**: RESTful API for programmatic access
- **Webhook Support**: Real-time notifications for new releases

### Phase 5: Enterprise Features

- **Multi-tenant Support**: Organization-specific release configurations
- **Custom Categories**: Allow users to organize changes by their priorities
- **Comparison History**: Track and save comparison results
- **Export Capabilities**: Generate PDF/Excel reports
- **Authentication**: Secure access for sensitive release information
- **Audit Logging**: Track who accessed which release information

### Phase 6: Machine Learning

- **Smart Summaries**: AI-powered summaries tailored to user's specific use cases
- **Impact Prediction**: ML-based risk assessment for upgrades
- **Change Classification**: Automatic categorization of complex changes
- **Intelligent Recommendations**: Suggest releases based on feature needs

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

Please ensure:
- TypeScript code is properly typed
- Changes compile without errors (`npm run build`)
- Code follows existing style conventions
- Commit messages are clear and descriptive

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions:

1. **GitHub Issues**: [Open an issue on GitHub](https://github.com/yourusername/commvault-release-comparison-mcp/issues)
2. **Documentation**: Check the `docs/` directory for additional information
3. **Project Plan**: See `docs/project-plan.md` for architectural decisions

## Related Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [Commvault Product Documentation](https://documentation.commvault.com)
- [Claude AI Documentation](https://claude.ai)
- [Node.js MCP SDK](https://github.com/modelcontextprotocol/node-sdk)

---

**Version**: 1.0.0  
**Last Updated**: 2026-08-06  
**Maintainer**: Chandrakanth Sawant
