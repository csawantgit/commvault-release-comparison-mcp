import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
async function analyzeHTML(version, url) {
    console.log(`\n[${version}] Fetching ${url}...`);
    const response = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const html = await response.text();
    console.log(`[${version}] ✓ Analyzing HTML structure (${html.length} bytes)...`);
    // Find main content area
    console.log(`[${version}] Searching for main content containers...`);
    const mainContentPatterns = [
        /<main[^>]*>([\s\S]*?)<\/main>/i,
        /<article[^>]*>([\s\S]*?)<\/article>/i,
        /<div[^>]*id="content"[^>]*>([\s\S]*?)<\/div>/i,
        /<div[^>]*class="content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];
    let mainContent = html;
    for (const pattern of mainContentPatterns) {
        const match = html.match(pattern);
        if (match) {
            mainContent = match[1];
            console.log(`[${version}] Found main content via: ${pattern.source.slice(0, 40)}...`);
            break;
        }
    }
    // Extract all headings with position
    const headingRegex = /<h([1-6])[^>]*>([^<]+)<\/h\1>/gi;
    const headings = [];
    let match;
    while ((match = headingRegex.exec(html)) !== null) {
        const text = match[2]
            .replace(/<[^>]+>/g, "")
            .trim()
            .slice(0, 80);
        headings.push({
            text,
            level: `H${match[1]}`,
            position: match.index,
        });
    }
    // Extract navigation/TOC elements
    const navigationRegex = /<(nav|ul[^>]*class="[^"]*toc[^"]*"[^>]*)>([\s\S]*?)<\/(nav|ul)>/gi;
    const navigationElements = [];
    const navMatch = html.match(navigationRegex);
    if (navMatch) {
        navMatch.forEach((nav) => {
            const items = nav.match(/<li[^>]*>([^<]*)<\/li>/gi) || [];
            items.slice(0, 5).forEach((item) => {
                navigationElements.push({
                    text: item.replace(/<[^>]+>/g, "").trim().slice(0, 60),
                    type: "ToC/Navigation",
                });
            });
        });
    }
    // Analyze list structures
    console.log(`[${version}] Analyzing list structures...`);
    const ulRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
    const olRegex = /<ol[^>]*>([\s\S]*?)<\/ol>/gi;
    const lists = [];
    // UL lists
    let ulMatch;
    const ulPattern = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
    while ((ulMatch = ulPattern.exec(mainContent)) !== null) {
        const items = ulMatch[1].match(/<li[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/li>/gi) || [];
        if (items.length > 0) {
            lists.push({
                type: "UL",
                itemCount: items.length,
                sampleItems: items.slice(0, 3).map((item) => item
                    .replace(/<[^>]+>/g, "")
                    .trim()
                    .slice(0, 100)),
            });
        }
    }
    // OL lists
    let olMatch;
    const olPattern = /<ol[^>]*>([\s\S]*?)<\/ol>/gi;
    while ((olMatch = olPattern.exec(mainContent)) !== null) {
        const items = olMatch[1].match(/<li[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/li>/gi) || [];
        if (items.length > 0) {
            lists.push({
                type: "OL",
                itemCount: items.length,
                sampleItems: items.slice(0, 3).map((item) => item
                    .replace(/<[^>]+>/g, "")
                    .trim()
                    .slice(0, 100)),
            });
        }
    }
    // Analyze content sections (heading + following content)
    console.log(`[${version}] Extracting content sections...`);
    const contentSections = [];
    const h2Pattern = /<h2[^>]*>([^<]+)<\/h2>([\s\S]*?)(?=<h2|$)/gi;
    let h2Match;
    while ((h2Match = h2Pattern.exec(mainContent)) !== null) {
        const heading = h2Match[1].replace(/<[^>]+>/g, "").trim();
        const content = h2Match[2];
        // Determine content structure
        let structureType = "unknown";
        if (content.includes("<ul>") || content.includes("<ol>")) {
            structureType = "list-based";
        }
        else if (content.match(/<p[^>]*>[^<]+<\/p>/)) {
            structureType = "paragraph-based";
        }
        else if (content.match(/<strong>/) || content.match(/<b>/)) {
            structureType = "formatted-text";
        }
        // Extract first feature/item
        const listMatch = content.match(/<li[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/li>/);
        const pMatch = content.match(/<p[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/p>/);
        const firstItem = (listMatch?.[1] || pMatch?.[1] || "")
            .replace(/<[^>]+>/g, "")
            .trim()
            .slice(0, 150);
        if (heading.length > 0 && !heading.includes("Page contents")) {
            contentSections.push({
                heading,
                contentPreview: firstItem || "(empty section)",
                structureType,
            });
        }
    }
    // Generate recommendations
    const recommendations = [];
    if (navigationElements.length > 0) {
        recommendations.push(`❌ Navigation/TOC detected (${navigationElements.length} items) - use selectors to exclude nav elements`);
    }
    if (lists.filter((l) => l.type === "UL").length > 0) {
        recommendations.push(`✓ UL lists detected - use <ul><li> selector for feature extraction`);
    }
    if (lists.filter((l) => l.type === "OL").length > 0) {
        recommendations.push(`✓ OL lists detected - consider <ol><li> for numbered features`);
    }
    if (contentSections.length > 0) {
        const listBased = contentSections.filter((s) => s.structureType === "list-based").length;
        const paraBased = contentSections.filter((s) => s.structureType === "paragraph-based").length;
        if (listBased > paraBased) {
            recommendations.push(`✓ Majority of sections are list-based (${listBased}/${contentSections.length}) - focus on list extraction`);
        }
        else if (paraBased > listBased) {
            recommendations.push(`⚠ Many paragraph-based sections (${paraBased}/${contentSections.length}) - need paragraph parsing`);
        }
    }
    if (mainContent.length < html.length * 0.5) {
        recommendations.push(`✓ Main content container identified (reduces noise by ${Math.round((1 - mainContent.length / html.length) * 100)}%)`);
    }
    else {
        recommendations.push(`⚠ Could not isolate main content - full HTML being parsed`);
    }
    // Check for feature identifiers
    if (html.includes("data-feature") || html.includes("class=\"feature")) {
        recommendations.push(`✓ HTML has feature-specific classes or attributes - use them`);
    }
    return {
        version,
        url,
        analysisTime: new Date().toISOString(),
        structure: {
            mainContentSelectors: [
                "main",
                "article",
                'div#content',
                'div.content',
            ],
            headings: headings.slice(0, 10),
            navigationElements: navigationElements.slice(0, 5),
            lists,
            contentSections: contentSections.slice(0, 8),
        },
        recommendations,
    };
}
async function main() {
    console.log("=".repeat(80));
    console.log("HTML Structure Analysis");
    console.log("=".repeat(80));
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
    const outputDir = path.join(__dirname, "../../analysis");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    for (const { version, url } of versions) {
        try {
            const analysis = await analyzeHTML(version, url);
            // Save analysis
            const analysisPath = path.join(outputDir, `${version}-structure.json`);
            fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
            console.log(`[${version}] Analysis saved to: ${analysisPath}`);
            // Print summary
            console.log(`\n${"=".repeat(80)}`);
            console.log(`${version} - HTML Structure Summary`);
            console.log("=".repeat(80));
            console.log(`\n📄 Headings Found (first 10):`);
            analysis.structure.headings.forEach((h) => {
                console.log(`  ${h.level}: "${h.text}"`);
            });
            console.log(`\n📋 Lists Detected:`);
            analysis.structure.lists.forEach((l) => {
                console.log(`  ${l.type} list: ${l.itemCount} items`);
                l.sampleItems.forEach((item) => console.log(`    - ${item}`));
            });
            console.log(`\n📑 Content Sections (first 8):`);
            analysis.structure.contentSections.forEach((section) => {
                console.log(`  ${section.heading} [${section.structureType}]`);
                console.log(`    Preview: ${section.contentPreview}`);
            });
            console.log(`\n💡 Recommendations:`);
            analysis.recommendations.forEach((rec) => {
                console.log(`  ${rec}`);
            });
        }
        catch (error) {
            console.error(`[${version}] Error:`, error);
        }
    }
    console.log(`\n${"=".repeat(80)}`);
    console.log(`Analysis files saved to analysis/ directory`);
}
main().catch(console.error);
