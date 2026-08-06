import { DataSource, ReleaseData } from "./types.js";
import { ReleaseLoader } from "./releaseLoader.js";

/**
 * Live Documentation Data Source
 * Fetches release data from live Commvault documentation using ReleaseLoader
 */
export class LiveDocumentationSource implements DataSource {
  name = "Live Commvault Documentation";
  description = "Fetches release data from live Commvault documentation pages";

  private loader: ReleaseLoader;
  private supportedVersions: string[];

  constructor() {
    this.supportedVersions = ["11.44", "11.46"];

    this.loader = new ReleaseLoader({
      urls: {
        "11.44":
          "https://documentation.commvault.com/commvault/v11/article?p=116842.htm",
        "11.46":
          "https://documentation.commvault.com/commvault/v11/article?p=139640.htm",
      },
      dates: {
        "11.44": "2023-04-15",
        "11.46": "2023-08-20",
      },
    });
  }

  async fetch(version: string): Promise<ReleaseData> {
    if (!this.supportedVersions.includes(version)) {
      throw new Error(
        `Version ${version} not supported by LiveDocumentationSource. Supported: ${this.supportedVersions.join(", ")}`
      );
    }

    const data = await this.loader.loadFromURL(version);

    if (!data) {
      throw new Error(
        `Failed to load release data for version ${version} from live documentation`
      );
    }

    return data;
  }

  getAvailableVersions(): string[] {
    return this.supportedVersions;
  }
}
