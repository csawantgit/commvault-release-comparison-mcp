import { ReleaseLoader } from "./releaseLoader.js";
/**
 * Live Documentation Data Source
 * Fetches release data from live Commvault documentation using ReleaseLoader
 */
export class LiveDocumentationSource {
    constructor() {
        this.name = "Live Commvault Documentation";
        this.description = "Fetches release data from live Commvault documentation pages";
        this.supportedVersions = ["11.44", "11.46"];
        this.loader = new ReleaseLoader({
            urls: {
                "11.44": "https://documentation.commvault.com/commvault/v11/article?p=116842.htm",
                "11.46": "https://documentation.commvault.com/commvault/v11/article?p=139640.htm",
            },
            dates: {
                "11.44": "2023-04-15",
                "11.46": "2023-08-20",
            },
        });
    }
    async fetch(version) {
        if (!this.supportedVersions.includes(version)) {
            throw new Error(`Version ${version} not supported by LiveDocumentationSource. Supported: ${this.supportedVersions.join(", ")}`);
        }
        const data = await this.loader.loadFromURL(version);
        if (!data) {
            throw new Error(`Failed to load release data for version ${version} from live documentation`);
        }
        return data;
    }
    getAvailableVersions() {
        return this.supportedVersions;
    }
}
