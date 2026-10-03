import type {
  PackageSearchItem,
  RemoteSearchPage,
  SearchFilters,
  SearchOptions,
} from '../domain/package-search-item';

/** What the search use case needs from the registry's search endpoint. */
export interface PackageSearchRemote {
  search(
    filters: SearchFilters,
    options: SearchOptions,
    cursor?: string,
  ): Promise<RemoteSearchPage>;
}

/**
 * The catalog this host already knows about, so a search can answer before the
 * registry replies. Implementations own both the in-memory copy and its
 * persistence.
 */
export interface PackageCatalogRepository {
  load(): Promise<Record<string, PackageSearchItem>>;
  /** Remembers what the registry just returned, so the next search has it. */
  upsert(items: PackageSearchItem[]): Promise<void>;
  /** Drops the in-memory copy; the next `load` reads through again. */
  reset(): void;
}
