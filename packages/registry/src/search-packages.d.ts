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
export interface HybridSearchResult {
  localResults: PackageSearchItem[];
  remote: Promise<RemoteSearchPage>;
}
export declare const CATALOG_KEY = 'packages';
export declare function searchPackages(
  filters?: SearchFilters,
  options?: SearchOptions,
): Promise<HybridSearchResult>;
export declare function fetchRemotePackages(
  filters: SearchFilters,
  options: SearchOptions,
  cursor?: string,
): Promise<RemoteSearchPage>;
export declare function filterPackages(
  packages: PackageSearchItem[],
  filters: SearchFilters,
  options?: SearchOptions,
): PackageSearchItem[];
export declare function resetPackageCatalogMemory(): void;
