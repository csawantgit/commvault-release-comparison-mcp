export interface Change {
  id: string;
  title: string;
  description: string;
}

export interface ReleaseData {
  version: string;
  releaseDate: string;
  categories: Record<string, Change[]>;
}

export interface DataSource {
  name: string;
  description: string;
  fetch(version: string): Promise<ReleaseData>;
}

export interface FetchedReleaseData {
  version: string;
  releaseDate: string;
  rawContent: string;
  source: string;
}
