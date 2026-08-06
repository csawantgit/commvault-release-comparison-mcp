import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { ReleaseManager } from "./data/releaseManager.js";
const server = new Server({
    name: "commvault-release-comparison",
    version: "1.0.0",
});
server.registerCapabilities({
    tools: {},
});
const releaseManager = ReleaseManager.getInstance();
// Tool definitions will be generated dynamically after loading releases
let tools = [];
function generateToolDefinitions(availableVersions, availableCategories) {
    return [
        {
            name: "compare_releases",
            description: "Compare two Commvault release versions and show differences category-wise",
            inputSchema: {
                type: "object",
                properties: {
                    version1: {
                        type: "string",
                        description: `First version to compare. Available: ${availableVersions.join(", ")}`,
                    },
                    version2: {
                        type: "string",
                        description: `Second version to compare. Available: ${availableVersions.join(", ")}`,
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
                        description: `Release version. Available: ${availableVersions.join(", ")}`,
                    },
                    category: {
                        type: "string",
                        description: `Optional filter by category. Available: ${availableCategories.join(", ")}`,
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
                        description: `Category to retrieve. Available: ${availableCategories.join(", ")}`,
                    },
                    start_version: {
                        type: "string",
                        description: `Optional start version for filtering. Available: ${availableVersions.join(", ")}`,
                    },
                    end_version: {
                        type: "string",
                        description: `Optional end version for filtering. Available: ${availableVersions.join(", ")}`,
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
                        description: `Release version. Available: ${availableVersions.join(", ")}`,
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
}
// Request handler
const requestHandler = async (request) => {
    const { name, arguments: args } = request.params;
    try {
        let result;
        switch (name) {
            case "compare_releases":
                result = await handleCompareReleases(args.version1, args.version2);
                break;
            case "get_release_changes":
                result = await handleGetReleaseChanges(args.version, args.category);
                break;
            case "get_category_changes":
                result = await handleGetCategoryChanges(args.category, args.start_version, args.end_version);
                break;
            case "generate_summary":
                result = await handleGenerateSummary(args.version, args.format, args.include_metrics);
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
async function handleCompareReleases(version1, version2) {
    const rel1 = await releaseManager.getRelease(version1);
    const rel2 = await releaseManager.getRelease(version2);
    if (!rel1 || !rel2) {
        const available = releaseManager.getAvailableVersions();
        throw new Error(`Invalid version. Available: ${available.join(", ")}`);
    }
    const categories = releaseManager.getAvailableCategories();
    const categoryComparison = {};
    for (const category of categories) {
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
async function handleGetReleaseChanges(version, category) {
    const release = await releaseManager.getRelease(version);
    if (!release) {
        const available = releaseManager.getAvailableVersions();
        throw new Error(`Invalid version. Available: ${available.join(", ")}`);
    }
    if (category) {
        const availableCategories = releaseManager.getAvailableCategories();
        if (!availableCategories.includes(category)) {
            throw new Error(`Invalid category. Available: ${availableCategories.join(", ")}`);
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
async function handleGetCategoryChanges(category, startVersion, endVersion) {
    const availableCategories = releaseManager.getAvailableCategories();
    if (!availableCategories.includes(category)) {
        throw new Error(`Invalid category. Available: ${availableCategories.join(", ")}`);
    }
    const changesByVersion = {};
    let totalChanges = 0;
    const releases = releaseManager.getReleases();
    for (const version of Object.keys(releases)) {
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
async function handleGenerateSummary(version, format = "markdown", includeMetrics = true) {
    const release = await releaseManager.getRelease(version);
    if (!release) {
        const available = releaseManager.getAvailableVersions();
        throw new Error(`Invalid version. Available: ${available.join(", ")}`);
    }
    const availableCategories = releaseManager.getAvailableCategories();
    const metrics = {};
    for (const cat of availableCategories) {
        metrics[cat.toLowerCase().replace(/\s+/g, "_")] =
            release.categories[cat]?.length || 0;
    }
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
        const categoryDetails = availableCategories
            .map((cat) => {
            const changes = release.categories[cat] || [];
            if (changes.length === 0)
                return "";
            const items = changes.map((c) => `- **${c.title}**: ${c.description}`);
            return `### ${cat}\n${items.join("\n")}`;
        })
            .filter(Boolean)
            .join("\n\n");
        const metricsSection = includeMetrics
            ? `## Statistics\n${availableCategories.map((cat) => `- ${cat}: ${release.categories[cat]?.length || 0} enhancements`).join("\n")}\n- **Total**: ${total} enhancements`
            : "";
        const content = `# Commvault ${version} Release

**Release Date**: ${release.releaseDate}

## Summary
Release ${version} includes ${total} major enhancements across ${availableCategories.join(", ").toLowerCase()} categories.

## Changes by Category

${categoryDetails}

${metricsSection}`;
        return { ...baseResult, content };
    }
    if (format === "html") {
        const categoryDetails = availableCategories
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
        const content = `<h1>Commvault ${version} Release</h1><p><strong>Release Date:</strong> ${release.releaseDate}</p><p>Release ${version} includes ${total} major enhancements.</p><h2>Changes by Category</h2>${categoryDetails}`;
        return { ...baseResult, content };
    }
    return baseResult;
}
// Register handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
});
server.setRequestHandler(CallToolRequestSchema, requestHandler);
// Start server
async function main() {
    try {
        // Initialize release manager with default versions
        console.error("[Startup] Loading release data...");
        await releaseManager.initialize(["11.44", "11.46"]);
        // Generate tool definitions with loaded data
        const availableVersions = releaseManager.getAvailableVersions();
        const availableCategories = releaseManager.getAvailableCategories();
        tools = generateToolDefinitions(availableVersions, availableCategories);
        console.error(`[Startup] Loaded ${availableVersions.length} versions: ${availableVersions.join(", ")}`);
        console.error(`[Startup] Available categories: ${availableCategories.join(", ")}`);
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Commvault Release Comparison MCP Server started");
    }
    catch (error) {
        console.error("Startup error:", error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
