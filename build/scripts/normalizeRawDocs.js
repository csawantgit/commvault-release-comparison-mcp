import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Mapping from page headings to categories
const HEADING_TO_CATEGORY = {
    Virtualization: "Virtualization",
    "VMware": "Virtualization",
    "Hyper-V": "Virtualization",
    Kubernetes: "Virtualization",
    Security: "Security",
    Encryption: "Security",
    "SQL Server": "Database",
    Databases: "Database",
    "MySQL": "Database",
    "Oracle": "Database",
    "PostgreSQL": "Database",
    Storage: "Storage",
    "Object Storage": "Storage",
    "Tape": "Storage",
    Reports: "Platform",
    "CommCell Management": "Platform",
    "CommCell": "Platform",
    "Commvault Store": "Platform",
    "Install and Deployment": "Platform",
    "Backup and Restore Agents": "Platform",
    Performance: "Performance",
};
async function fetchPageAndParse(version, url) {
    console.log(`\n[${version}] Fetching full HTML...`);
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const html = await response.text();
        console.log(`[${version}] ✓ Downloaded and parsing...`);
        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        const pageTitle = titleMatch ? titleMatch[1].trim() : "Unknown";
        // Release dates (hardcoded for now, should come from page)
        const releaseDates = {
            "11.44": "2023-04-15",
            "11.46": "2023-08-20",
        };
        const releaseDate = releaseDates[version] || new Date().toISOString();
        // Extract features by parsing HTML structure
        const categories = extractFeaturesFromHTML(html, version);
        // Count total changes
        const totalChanges = Object.values(categories).reduce((sum, features) => sum + features.length, 0);
        return {
            version,
            releaseDate,
            dataSource: "Live Commvault Documentation",
            categories,
            metadata: {
                fetchedAt: new Date().toISOString(),
                pageTitle,
                totalChanges,
                extractionNotes: "Extracted from live documentation using heading-based parsing",
            },
        };
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[${version}] ✗ Error: ${errorMsg}`);
        throw error;
    }
}
function extractFeaturesFromHTML(html, version) {
    const categories = {
        Virtualization: [],
        Security: [],
        Database: [],
        Storage: [],
        Platform: [],
        Performance: [],
    };
    // Remove script and style tags
    let cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    cleanHtml = cleanHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
    // Split by headings (h2, h3)
    const headingRegex = /<h[23][^>]*>([^<]+)<\/h[23]>/gi;
    let lastHeading = "Platform";
    let lastCategory = "Platform";
    let changeCounter = {};
    const headingMatches = Array.from(html.matchAll(headingRegex));
    for (let i = 0; i < headingMatches.length; i++) {
        const match = headingMatches[i];
        const heading = match[1].replace(/<[^>]+>/g, "").trim();
        const startPos = match.index + match[0].length;
        const endPos = headingMatches[i + 1]?.index ?? html.length;
        // Determine category
        lastCategory = determineCategory(heading);
        lastHeading = heading;
        // Extract content until next heading
        const sectionContent = html.substring(startPos, endPos);
        // Extract features (list items, paragraphs, etc.)
        const features = extractFeatures(sectionContent, heading, lastCategory, version, (changeCounter[lastCategory] = (changeCounter[lastCategory] || 0)));
        changeCounter[lastCategory] += features.length;
        if (features.length > 0) {
            categories[lastCategory].push(...features);
            console.log(`[${version}] ${lastHeading} (${lastCategory}): ${features.length} features`);
        }
    }
    return categories;
}
function determineCategory(heading) {
    const lowerHeading = heading.toLowerCase();
    for (const [key, category] of Object.entries(HEADING_TO_CATEGORY)) {
        if (lowerHeading.includes(key.toLowerCase())) {
            return category;
        }
    }
    // Default to Platform for unknown categories
    return "Platform";
}
function extractFeatures(content, headingName, category, version, startIndex) {
    const features = [];
    // Clean the content first
    let cleanContent = content
        .replace(/Page contents[^<]*/gi, "")
        .replace(/Related Topics[^<]*/gi, "")
        .replace(/Learn more[^<]*/gi, "");
    // Extract from list items
    const listItemRegex = /<li[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/li>/gi;
    let match;
    let counter = startIndex;
    while ((match = listItemRegex.exec(cleanContent)) !== null) {
        const text = match[1]
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim();
        if (text.length > 10 && text.length < 300) {
            // Reasonable length
            const [firstPart] = text.split(/:|–|—/);
            features.push({
                id: `${version}-${category.toLowerCase()}-${++counter}`,
                title: firstPart.trim().slice(0, 100),
                description: text.slice(0, 250),
                source_heading: headingName,
            });
        }
    }
    // Extract from paragraphs if few list items found
    if (features.length < 2) {
        const pRegex = /<p[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/p>/gi;
        counter = startIndex + features.length;
        while ((match = pRegex.exec(cleanContent)) !== null) {
            const text = match[1]
                .replace(/<[^>]+>/g, "")
                .replace(/\s+/g, " ")
                .trim();
            if (text.length > 30 &&
                text.length < 300 &&
                !text.match(/^(In this|On this|The|A\s)/i)) {
                const title = text.split(/[.!?]/)[0].slice(0, 100);
                features.push({
                    id: `${version}-${category.toLowerCase()}-${++counter}`,
                    title,
                    description: text.slice(0, 250),
                    source_heading: headingName,
                });
                if (features.length >= 3)
                    break;
            }
        }
    }
    return features;
}
async function main() {
    console.log("=".repeat(70));
    console.log("Commvault Documentation Normalization");
    console.log("=".repeat(70));
    const dataDir = path.join(__dirname, "../../data");
    const versions = [
        {
            version: "11.44",
            url: "https://documentation.commvault.com/11.44/software/changes_in_long_term_support_release_11_44.html",
        },
        {
            version: "11.46",
            url: "https://documentation.commvault.com/11.46/software/changes_in_innovation_release_11_46.html",
        },
    ];
    const results = {};
    for (const { version, url } of versions) {
        try {
            const normalized = await fetchPageAndParse(version, url);
            results[version] = normalized;
            // Save to JSON file
            const jsonPath = path.join(dataDir, `${version}.normalized.json`);
            fs.writeFileSync(jsonPath, JSON.stringify(normalized, null, 2));
            console.log(`[${version}] Saved to: ${jsonPath}`);
        }
        catch (error) {
            console.error(`[${version}] Failed:`, error);
        }
    }
    // Summary
    console.log("\n" + "=".repeat(70));
    console.log("Normalization Summary");
    console.log("=".repeat(70));
    for (const [version, data] of Object.entries(results)) {
        console.log(`\n${version}:`);
        console.log(`  Release Date: ${data.releaseDate}`);
        console.log(`  Data Source: ${data.dataSource}`);
        console.log(`  Total Changes: ${data.metadata.totalChanges}`);
        console.log(`  Page Title: "${data.metadata.pageTitle}"`);
        console.log(`\n  Categories:`);
        for (const [category, changes] of Object.entries(data.categories)) {
            if (changes.length > 0) {
                console.log(`    - ${category}: ${changes.length} changes`);
            }
        }
    }
    console.log("\n" + "=".repeat(70));
    console.log("Files saved:");
    for (const version of versions.map((v) => v.version)) {
        console.log(`  - data/${version}.normalized.json`);
    }
}
main().catch(console.error);
