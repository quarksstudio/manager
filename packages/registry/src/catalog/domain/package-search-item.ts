export interface PackageSearchItem {
  name: string;
  version: string;
  description: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface SearchFilters {
  name?: string;
  description?: string;
  tags?: string[];
  query?: string;
}

export interface SearchOptions {
  matchMode?: 'any' | 'all';
  exact?: boolean;
  limitLocal?: number;
}

export interface RemoteSearchPage {
  items: PackageSearchItem[];
  totalCount: number;
  nextCursor: string | null;
}

/**
 * The local catalog answers immediately while the registry is still being asked,
 * which is why the remote half is a promise the caller may or may not await.
 */
export interface HybridSearchResult {
  localResults: PackageSearchItem[];
  remote: Promise<RemoteSearchPage>;
}
