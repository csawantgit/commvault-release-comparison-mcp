import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCUMENTATION_URLS = {
    "11.44": "https://documentation.commvault.com/11.44/software/changes_in_long_term_support_release_11_44.html",
    "11.46": "https://documentation.commvault.com/11.46/software/changes_in_innovation_release_11_46.html",
};
async function fetchAndParse(version, url) {
    console.log(`\n[${version}] Fetching: ${url}`);
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
        console.log(`[${version}] ✓ Downloaded ${html.length} bytes`);
        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        const pageTitle = titleMatch ? titleMatch[1].trim() : "Unknown";
        // Extract all headings (h1-h6)
        const headingMatches = html.match(/<h[1-6][^>]*>([^<]*)<\/h[1-6]>/gi) || [];
        const headings = headingMatches
            .map((h) => h.replace(/<[^>]+>/g, "").trim())
            .filter((h) => h.length > 0);
        // Extract all list items
        const listItemMatches = html.match(/<li[^>]*>([^<]*)<\/li>/gi) || [];
        const listItems = listItemMatches
            .map((li) => li.replace(/<[^>]+>/g, "").trim())
            .filter((li) => li.length > 0);
        const result = {
            version,
            url,
            fetchedAt: new Date().toISOString(),
            pageTitle,
            headingsCount: headings.length,
            listItemsCount: listItems.length,
            headings: headings.slice(0, 50), // First 50 headings
            listItems: listItems.slice(0, 100), // First 100 list items
            rawHtmlLength: html.length,
            status: "success",
        };
        console.log(`[${version}] Page title: "${pageTitle}"`);
        console.log(`[${version}] Headings found: ${result.headingsCount}`);
        console.log(`[${version}] List items found: ${result.listItemsCount}`);
        console.log(`[${version}] Raw HTML size: ${html.length} bytes`);
        return result;
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[${version}] ✗ Error: ${errorMsg}`);
        return {
            version,
            url,
            fetchedAt: new Date().toISOString(),
            pageTitle: "ERROR",
            headingsCount: 0,
            listItemsCount: 0,
            headings: [],
            listItems: [],
            rawHtmlLength: 0,
            status: `error: ${errorMsg}`,
        };
    }
}
async function main() {
    console.log("=".repeat(60));
    console.log("Commvault Documentation Live Fetch");
    console.log("=".repeat(60));
    const dataDir = path.join(__dirname, "../../data");
    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`Created directory: ${dataDir}`);
    }
    const results = {};
    // Fetch both versions
    for (const [version, url] of Object.entries(DOCUMENTATION_URLS)) {
        const pageContent = await fetchAndParse(version, url);
        results[version] = pageContent;
        // Save to JSON file
        const jsonPath = path.join(dataDir, `${version}.raw.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(pageContent, null, 2));
        console.log(`[${version}] Saved to: ${jsonPath}`);
    }
    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("Summary");
    console.log("=".repeat(60));
    for (const [version, result] of Object.entries(results)) {
        console.log(`\n${version}:`);
        console.log(`  Status: ${result.status}`);
        console.log(`  Page title: "${result.pageTitle}"`);
        console.log(`  Headings: ${result.headingsCount}`);
        console.log(`  List items: ${result.listItemsCount}`);
        console.log(`  Raw HTML: ${result.rawHtmlLength} bytes`);
    }
    console.log("\n" + "=".repeat(60));
    console.log("Files saved:");
    for (const version of Object.keys(DOCUMENTATION_URLS)) {
        console.log(`  - data/${version}.raw.json`);
    }
}
main().catch(console.error);
