import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  Tool,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server({
  name: "commvault-release-comparison",
  version: "1.0.0",
});

server.registerCapabilities({
  tools: {},
});

// Define request handlers
const requestHandlers = {
  "tools/list": async () => {
    return {
      tools,
    };
  },
  "tools/call": async (request: any) => {
    const { name, arguments: args } = request.params;

    try {
      let result: object;

      switch (name) {
        case "compare_releases":
          result = await handleCompareReleases(
            args.version1 as string,
            args.version2 as string
          );
          break;

        case "get_release_changes":
          result = await handleGetReleaseChanges(
            args.version as string,
            args.category as string | undefined
          );
          break;

        case "get_category_changes":
          result = await handleGetCategoryChanges(
            args.category as string,
            args.start_version as string | undefined,
            args.end_version as string | undefined
          );
          break;

        case "generate_summary":
          result = await handleGenerateSummary(
            args.version as string,
            args.format as string | undefined,
            args.include_metrics as boolean | undefined
          );
          break;

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
};

// Tool definitions
const tools: Tool[] = [
  {
    name: "compare_releases",
    description:
      "Compare two Commvault release versions and get a summary of differences",
    inputSchema: {
      type: "object",
      properties: {
        version1: {
          type: "string",
          description: "First version to compare (e.g., '2024.06')",
        },
        version2: {
          type: "string",
          description: "Second version to compare (e.g., '2024.12')",
        },
      },
      required: ["version1", "version2"],
    },
  },
  {
    name: "get_release_changes",
    description: "Get detailed changes for a specific Commvault release version",
    inputSchema: {
      type: "object",
      properties: {
        version: {
          type: "string",
          description: "Release version (e.g., '2024.12')",
        },
        category: {
          type: "string",
          description:
            "Optional filter by category (features, fixes, security, performance)",
        },
      },
      required: ["version"],
    },
  },
  {
    name: "get_category_changes",
    description: "Get all changes within a specific category across versions",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["features", "fixes", "security", "performance", "deprecated"],
          description: "Change category to retrieve",
        },
        start_version: {
          type: "string",
          description: "Optional start version for filtering",
        },
        end_version: {
          type: "string",
          description: "Optional end version for filtering",
        },
      },
      required: ["category"],
    },
  },
  {
    name: "generate_summary",
    description: "Generate a release summary report for marketing or documentation",
    inputSchema: {
      type: "object",
      properties: {
        version: {
          type: "string",
          description: "Release version to summarize",
        },
        format: {
          type: "string",
          enum: ["markdown", "html", "plaintext"],
          description: "Output format for the summary",
        },
        include_metrics: {
          type: "boolean",
          description: "Include performance metrics and statistics",
        },
      },
      required: ["version"],
    },
  },
];

// Mock data
const mockCompareData = {
  version1: "2024.06",
  version2: "2024.12",
  comparison: {
    new_features: 24,
    bug_fixes: 156,
    security_patches: 12,
    performance_improvements: 8,
    deprecated_features: 3,
  },
  major_highlights: [
    "Enhanced backup scalability for large environments",
    "Improved disaster recovery capabilities",
    "New AI-powered analytics dashboard",
    "Advanced deduplication algorithms",
  ],
};

const mockReleaseChanges = {
  version: "2024.12",
  release_date: "2024-12-15",
  changes: {
    features: [
      {
        id: "FEAT-001",
        title: "Enhanced backup scalability",
        description: "Support for backup jobs up to 100TB",
      },
      {
        id: "FEAT-002",
        title: "New REST API endpoints",
        description: "Added 15 new API endpoints for better integration",
      },
    ],
    fixes: [
      {
        id: "FIX-001",
        title: "Memory leak in backup engine",
        description: "Fixed memory leak affecting long-running backups",
      },
      {
        id: "FIX-002",
        title: "Improved error handling",
        description: "Better error messages and recovery procedures",
      },
    ],
    security: [
      {
        id: "SEC-001",
        title: "CVE-2024-1234 patched",
        description: "Critical security vulnerability resolved",
      },
    ],
  },
};

const mockCategoryChanges = {
  category: "features",
  total_count: 24,
  changes: [
    {
      id: "FEAT-001",
      title: "Enhanced backup scalability",
      version: "2024.12",
    },
    {
      id: "FEAT-002",
      title: "New REST API endpoints",
      version: "2024.12",
    },
    {
      id: "FEAT-003",
      title: "AI-powered analytics",
      version: "2024.12",
    },
    {
      id: "FEAT-004",
      title: "Improved disaster recovery",
      version: "2024.09",
    },
  ],
};

const mockSummary = {
  version: "2024.12",
  title: "Commvault 2024.12 Release",
  summary:
    "The 2024.12 release brings significant improvements to backup scalability, disaster recovery, and security.",
  highlights: [
    "Support for backups up to 100TB",
    "15 new REST API endpoints",
    "AI-powered analytics dashboard",
    "12 critical security patches",
  ],
  statistics: {
    total_changes: 200,
    new_features: 24,
    bug_fixes: 156,
    security_patches: 12,
    performance_improvements: 8,
  },
  release_date: "2024-12-15",
  documentation_url: "https://docs.commvault.com/2024.12",
};

// Tool handlers
async function handleCompareReleases(
  version1: string,
  version2: string
): Promise<object> {
  return {
    ...mockCompareData,
    version1,
    version2,
  };
}

async function handleGetReleaseChanges(
  version: string,
  category?: string
): Promise<object> {
  const result = {
    ...mockReleaseChanges,
    version,
  };

  if (category && category in mockReleaseChanges.changes) {
    return {
      version,
      release_date: mockReleaseChanges.release_date,
      changes: {
        [category]:
          mockReleaseChanges.changes[
            category as keyof typeof mockReleaseChanges.changes
          ],
      },
    };
  }

  return result;
}

async function handleGetCategoryChanges(
  category: string,
  _startVersion?: string,
  _endVersion?: string
): Promise<object> {
  return {
    ...mockCategoryChanges,
    category,
  };
}

async function handleGenerateSummary(
  version: string,
  format: string = "markdown",
  includeMetrics: boolean = true
): Promise<object> {
  const baseResult = {
    ...mockSummary,
    version,
    format,
    include_metrics: includeMetrics,
  };

  if (format === "markdown") {
    return {
      ...baseResult,
      content: `# Commvault ${version} Release

## Overview
The ${version} release brings significant improvements to backup scalability, disaster recovery, and security.

## Key Highlights
- Support for backups up to 100TB
- 15 new REST API endpoints
- AI-powered analytics dashboard
- 12 critical security patches

## Statistics
- Total Changes: 200
- New Features: 24
- Bug Fixes: 156
- Security Patches: 12`,
    };
  }

  if (format === "html") {
    return {
      ...baseResult,
      content: `<h1>Commvault ${version} Release</h1><p>The ${version} release brings significant improvements...</p>`,
    };
  }

  return baseResult;
}

// Register handlers with SDK schemas
server.setRequestHandler(ListToolsRequestSchema, requestHandlers["tools/list"] as any);
server.setRequestHandler(
  CallToolRequestSchema,
  requestHandlers["tools/call"] as any
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Commvault Release Comparison MCP Server started");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
