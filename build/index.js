import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { releases, allVersions, allCategories } from "./data/releases.js";
const server = new Server({
    name: "commvault-release-comparison",
    version: "1.0.0",
});
server.registerCapabilities({
    tools: {},
});
// Tool definitions
const tools = [
    {
        name: "compare_releases",
        description: "Compare two Commvault release versions and show differences category-wise",
        inputSchema: {
            type: "object",
            properties: {
                version1: {
                    type: "string",
                    description: `First version to compare. Available: ${allVersions.join(", ")}`,
                },
                version2: {
                    type: "string",
                    description: `Second version to compare. Available: ${allVersions.join(", ")}`,
                },
            },
            required: ["version1", "version2"],
        },
    },
    {
        name: "get_release_changes",
        description: "Get all changes for a selected release",
        inputSchema: {
            type: "object",
            properties: {
                version: {
                    type: "string",
                    description: `Release version. Available: ${allVersions.join(", ")}`,
                },
                category: {
                    type: "string",
                    description: `Optional filter by category. Available: ${allCategories.join(", ")}`,
                },
            },
            required: ["version"],
        },
    },
    {
        name: "get_category_changes",
        description: "Get changes for a selected category across releases",
        inputSchema: {
            type: "object",
            properties: {
                category: {
                    type: "string",
                    description: `Category to retrieve. Available: ${allCategories.join(", ")}`,
                },
                start_version: {
                    type: "string",
                    description: `Optional start version for filtering. Available: ${allVersions.join(", ")}`,
                },
                end_version: {
                    type: "string",
                    description: `Optional end version for filtering. Available: ${allVersions.join(", ")}`,
                },
            },
            required: ["category"],
        },
    },
    {
        name: "generate_summary",
        description: "Generate a human-readable summary for a release",
        inputSchema: {
            type: "object",
            properties: {
                version: {
                    type: "string",
                    description: `Release version. Available: ${allVersions.join(", ")}`,
                },
                format: {
                    type: "string",
                    enum: ["markdown", "html", "plaintext"],
                    description: "Output format for the summary",
                },
                include_metrics: {
                    type: "boolean",
                    description: "Include change counts and statistics",
                },
            },
            required: ["version"],
        },
    },
];
// Request handler
const requestHandler = async (request) => {
    const { name, arguments: args } = request.params;
    try {
        let result;
        switch (name) {
            case "compare_releases":
                result = handleCompareReleases(args.version1, args.version2);
                break;
            case "get_release_changes":
                result = handleGetReleaseChanges(args.version, args.category);
                break;
            case "get_category_changes":
                result = handleGetCategoryChanges(args.category, args.start_version, args.end_version);
                break;
            case "generate_summary":
                result = handleGenerateSummary(args.version, args.format, args.include_metrics);
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
    }
    catch (error) {
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
};
// Tool handlers
function handleCompareReleases(version1, version2) {
    const rel1 = releases[version1];
    const rel2 = releases[version2];
    if (!rel1 || !rel2) {
        throw new Error(`Invalid version. Available: ${allVersions.join(", ")}`);
    }
    const categoryComparison = {};
    for (const category of allCategories) {
        const v1Changes = rel1.categories[category] || [];
        const v2Changes = rel2.categories[category] || [];
        const v2Ids = new Set(v2Changes.map((c) => c.id));
        const v1Ids = new Set(v1Changes.map((c) => c.id));
        categoryComparison[category] = {
            version1_count: v1Changes.length,
            version2_count: v2Changes.length,
            new_in_v2: v2Changes
                .filter((c) => !v1Ids.has(c.id))
                .map((c) => c.title),
        };
    }
    return {
        version1,
        version2,
        release_date_v1: rel1.releaseDate,
        release_date_v2: rel2.releaseDate,
        category_comparison: categoryComparison,
    };
}
function handleGetReleaseChanges(version, category) {
    const release = releases[version];
    if (!release) {
        throw new Error(`Invalid version. Available: ${allVersions.join(", ")}`);
    }
    if (category) {
        if (!allCategories.includes(category)) {
            throw new Error(`Invalid category. Available: ${allCategories.join(", ")}`);
        }
        const changes = release.categories[category] || [];
        return {
            version,
            release_date: release.releaseDate,
            category,
            changes,
            total: changes.length,
        };
    }
    return {
        version,
        release_date: release.releaseDate,
        categories: Object.entries(release.categories).reduce((acc, [cat, changes]) => {
            acc[cat] = {
                changes,
                total: changes.length,
            };
            return acc;
        }, {}),
    };
}
function handleGetCategoryChanges(category, startVersion, endVersion) {
    if (!allCategories.includes(category)) {
        throw new Error(`Invalid category. Available: ${allCategories.join(", ")}`);
    }
    const changesByVersion = {};
    let totalChanges = 0;
    for (const version of allVersions) {
        const release = releases[version];
        const changes = release.categories[category] || [];
        if (changes.length > 0) {
            changesByVersion[version] = changes;
            totalChanges += changes.length;
        }
    }
    return {
        category,
        total_changes: totalChanges,
        changes_by_version: changesByVersion,
        versions_filtered: startVersion || endVersion ? true : false,
    };
}
function handleGenerateSummary(version, format = "markdown", includeMetrics = true) {
    const release = releases[version];
    if (!release) {
        throw new Error(`Invalid version. Available: ${allVersions.join(", ")}`);
    }
    const metrics = {
        virtualization: release.categories.Virtualization?.length || 0,
        security: release.categories.Security?.length || 0,
        database: release.categories.Database?.length || 0,
        storage: release.categories.Storage?.length || 0,
    };
    const total = Object.values(metrics).reduce((a, b) => a + b, 0);
    const baseResult = {
        version,
        release_date: release.releaseDate,
        format,
    };
    if (includeMetrics) {
        baseResult.metrics = {
            ...metrics,
            total,
        };
    }
    if (format === "markdown") {
        const categoryDetails = allCategories
            .map((cat) => {
            const changes = release.categories[cat] || [];
            if (changes.length === 0)
                return "";
            const items = changes.map((c) => `- **${c.title}**: ${c.description}`);
            return `### ${cat}\n${items.join("\n")}`;
        })
            .filter(Boolean)
            .join("\n\n");
        const content = `# Commvault ${version} Release

**Release Date**: ${release.releaseDate}

## Summary
Release ${version} includes ${total} major enhancements across virtualization, security, database, and storage categories.

## Changes by Category

${categoryDetails}

${includeMetrics
            ? `## Statistics
- Virtualization: ${metrics.virtualization} enhancements
- Security: ${metrics.security} enhancements
- Database: ${metrics.database} enhancements
- Storage: ${metrics.storage} enhancements
- **Total**: ${total} enhancements`
            : ""}`;
        return { ...baseResult, content };
    }
    if (format === "html") {
        const categoryDetails = allCategories
            .map((cat) => {
            const changes = release.categories[cat] || [];
            if (changes.length === 0)
                return "";
            const items = changes
                .map((c) => `<li><strong>${c.title}</strong>: ${c.description}</li>`)
                .join("");
            return `<h3>${cat}</h3><ul>${items}</ul>`;
        })
            .filter(Boolean)
            .join("");
        const content = `<h1>Commvault ${version} Release</h1><p><strong>Release Date:</strong> ${release.releaseDate}</p><p>Release ${version} includes ${total} major enhancements across virtualization, security, database, and storage categories.</p><h2>Changes by Category</h2>${categoryDetails}`;
        return { ...baseResult, content };
    }
    return baseResult;
}
// Register handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
}));
server.setRequestHandler(CallToolRequestSchema, requestHandler);
// Start server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Commvault Release Comparison MCP Server started");
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
