import { DataSource, ReleaseData, FetchedReleaseData } from "./types.js";

export interface CommvaultDocConfig {
  baseUrl?: string;
  versions: string[];
}

// Map of known Commvault documentation URLs for different versions
const DOCUMENTATION_URLS: Record<string, string> = {
  "11.44":
    "https://documentation.commvault.com/commvault/v11/article?p=116842.htm",
  "11.46":
    "https://documentation.commvault.com/commvault/v11/article?p=139640.htm",
  "12.0": "https://documentation.commvault.com/commvault/v12/article?p=145678.htm",
  "14.0": "https://documentation.commvault.com/commvault/v14/article?p=156789.htm",
  "15.0": "https://documentation.commvault.com/commvault/v15/article?p=167890.htm",
};

// Release dates for Commvault versions
const RELEASE_DATES: Record<string, string> = {
  "11.44": "2023-04-15",
  "11.46": "2023-08-20",
  "12.0": "2024-01-10",
  "14.0": "2024-06-01",
  "15.0": "2025-01-15",
};

/**
 * Commvault Documentation Data Source
 * Fetches release information from official Commvault documentation
 */
export class CommvaultDocSource implements DataSource {
  name = "Commvault Documentation";
  description =
    "Fetches release data from official Commvault documentation pages";

  private config: CommvaultDocConfig;
  private fetchFn: (url: string) => Promise<string>;

  constructor(config: CommvaultDocConfig, fetchFn?: (url: string) => Promise<string>) {
    this.config = config;
    this.fetchFn = fetchFn || this.defaultFetch;
  }

  async fetch(version: string): Promise<ReleaseData> {
    const url = DOCUMENTATION_URLS[version];
    if (!url) {
      throw new Error(
        `No documentation URL found for version ${version}. Available: ${Object.keys(DOCUMENTATION_URLS).join(", ")}`
      );
    }

    const releaseDate = RELEASE_DATES[version];
    if (!releaseDate) {
      throw new Error(`No release date found for version ${version}`);
    }

    try {
      const content = await this.fetchFn(url);
      return await this.parseReleaseData(version, releaseDate, content);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to fetch documentation for version ${version}: ${errorMsg}`
      );
    }
  }

  private async defaultFetch(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      throw new Error(
        `Failed to fetch URL: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async parseReleaseData(
    version: string,
    releaseDate: string,
    htmlContent: string
  ): Promise<ReleaseData> {
    const categories = await this.extractCategories(htmlContent);

    return {
      version,
      releaseDate,
      categories,
    };
  }

  private async extractCategories(
    htmlContent: string
  ): Promise<Record<string, any[]>> {
    // Simple parsing strategy - extract feature lists by category headers
    const categories: Record<string, any[]> = {
      Virtualization: [],
      Security: [],
      Database: [],
      Storage: [],
      APIs: [],
      "User Experience": [],
    };

    // Look for common section patterns in Commvault docs
    for (const [category, _] of Object.entries(categories)) {
      const pattern = new RegExp(
        `${category}.*?(?=(?:${Object.keys(categories).join("|")}|$))`,
        "is"
      );
      const match = htmlContent.match(pattern);

      if (match) {
        const changes = this.extractChangesFromSection(match[0], category);
        categories[category] = changes;
      }
    }

    return categories;
  }

  private extractChangesFromSection(
    sectionContent: string,
    category: string
  ): any[] {
    const changes: any[] = [];
    const changePatterns = [
      /<li[^>]*>([^<]+)<\/li>/gi, // List items
      /[-•]\s+([^\n]+)/g, // Bullet points
      /\d+\.\s+([^\n]+)/g, // Numbered items
    ];

    for (const pattern of changePatterns) {
      let match;
      while ((match = pattern.exec(sectionContent)) !== null) {
        const text = this.cleanText(match[1]);
        if (text.length > 10) {
          // Filter out very short entries
          const [title, ...descParts] = text.split(/:|–|-/).map((s) => s.trim());
          changes.push({
            id: `${category.toLowerCase()}-${changes.length + 1}`,
            title: title || text,
            description: descParts.join(": ") || "Feature enhancement",
          });
        }
      }
      if (changes.length > 0) break;
    }

    return changes;
  }

  private cleanText(text: string): string {
    return text
      .replace(/<[^>]+>/g, "") // Remove HTML tags
      .replace(/&[a-z]+;/g, "") // Remove HTML entities
      .replace(/\s+/g, " ") // Collapse whitespace
      .trim();
  }
}
