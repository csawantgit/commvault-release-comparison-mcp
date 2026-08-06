import * as cheerio from "cheerio";
import { ReleaseMapper } from "./releaseMapper.js";
export class ReleaseLoader {
    constructor(config) {
        this.mapper = new ReleaseMapper();
        this.config = config;
    }
    async loadFromURL(version) {
        const url = this.config.urls[version];
        const releaseDate = this.config.dates[version];
        if (!url || !releaseDate) {
            console.error(`[ReleaseLoader] Missing URL or date for version ${version}`);
            return null;
        }
        try {
            console.error(`[ReleaseLoader] Fetching ${version} from ${url}`);
            const html = await this.fetchHTML(url);
            if (!html) {
                console.error(`[ReleaseLoader] No content fetched for ${version}`);
                return null;
            }
            const items = this.parseHTML(html, version);
            if (items.length === 0) {
                console.error(`[ReleaseLoader] No items extracted for ${version}`);
                return null;
            }
            console.error(`[ReleaseLoader] Extracted ${items.length} items from ${version}`);
            const categorized = this.mapper.categorizeBatch(items, version);
            return {
                version,
                releaseDate,
                categories: categorized,
            };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`[ReleaseLoader] Error loading ${version}: ${errorMsg}`);
            return null;
        }
    }
    async fetchHTML(url) {
        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const text = await response.text();
            return text;
        }
        catch (error) {
            throw new Error(`Failed to fetch URL: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    parseHTML(html, version) {
        const items = [];
        try {
            const $ = cheerio.load(html);
            // Find main content area - look for common Commvault doc patterns
            let content = $("article").html();
            if (!content) {
                content = $("#content").html();
            }
            if (!content) {
                content = $("main").html();
            }
            if (!content) {
                content = $(".main-content").html();
            }
            if (!content) {
                console.error(`[ReleaseLoader] Could not find main content for ${version}`);
                return items;
            }
            const $content = cheerio.load(content);
            // Find all h2, h3 sections (category headers)
            const sections = new Map();
            let currentSection = "General";
            // Process all headers
            $content("h2, h3, h4").each((index, el) => {
                const $el = $content(el);
                const tagName = el.name ? el.name.toLowerCase() : "";
                if (tagName === "h2" || tagName === "h3" || tagName === "h4") {
                    currentSection = $el.text().trim();
                    if (currentSection && currentSection.length > 0) {
                        sections.set(currentSection, []);
                    }
                }
            });
            // Extract list items under sections
            $content("li").each((index, el) => {
                const $el = $content(el);
                const text = $el.text().trim();
                if (text && text.length > 10 && text.length < 500) {
                    if (!sections.has(currentSection)) {
                        sections.set(currentSection, []);
                    }
                    sections.get(currentSection).push(text);
                }
            });
            // Extract paragraphs that look like feature items
            $content("p").each((index, el) => {
                const $el = $content(el);
                // Skip if in footer, nav, or header
                if ($el.parent().is("footer, nav, header") ||
                    $el.parents("footer, nav, header").length > 0) {
                    return;
                }
                const text = $el.text().trim();
                if (text &&
                    text.length > 20 &&
                    text.length < 500 &&
                    !text.match(/^(copyright|©|all rights|last updated)/i)) {
                    // Check if this looks like a feature (contains action verbs, technical terms)
                    if (text.match(/new|support|enhanced|improve|add|change|update/i)) {
                        if (!sections.has(currentSection)) {
                            sections.set(currentSection, []);
                        }
                        sections.get(currentSection).push(text);
                    }
                }
            });
            // Collect all extracted items
            for (const [section, sectionItems] of sections) {
                for (const itemText of sectionItems) {
                    items.push({
                        text: itemText,
                        section: section,
                    });
                }
            }
            // Fallback: if we got very few items, try extracting all li elements
            if (items.length < 5) {
                console.error(`[ReleaseLoader] Extracted only ${items.length} items, falling back to all list items`);
                $content("li").each((index, el) => {
                    const text = $content(el).text().trim();
                    if (text && text.length > 10 && text.length < 500) {
                        items.push({
                            text: text,
                            section: "Features",
                        });
                    }
                });
            }
            return items;
        }
        catch (error) {
            console.error(`[ReleaseLoader] Parse error for ${version}: ${error instanceof Error ? error.message : String(error)}`);
            return items;
        }
    }
}
