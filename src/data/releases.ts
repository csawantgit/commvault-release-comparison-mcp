// Legacy exports for backward compatibility
// New code should use ReleaseManager from ./releaseManager.ts

export interface Change {
  id: string;
  title: string;
  description: string;
}

export interface ReleaseData {
  version: string;
  releaseDate: string;
  categories: {
    [category: string]: Change[];
  };
}

// Export the release manager for backward compatibility
export { ReleaseManager } from "./releaseManager.js";
