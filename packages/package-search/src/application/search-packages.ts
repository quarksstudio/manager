import { filterPackages } from '../domain/package-search-query';
import type {
  HybridSearchResult,
  PackageSearchItem,
  SearchFilters,
  SearchOptions,
} from '../domain/package-search-item';
import type {
  PackageCatalogRepository,
  PackageSearchRemote,
} from './package-catalog.repository';

export interface SearchDependencies {
  catalog: PackageCatalogRepository;
  remote: PackageSearchRemote;
}

/**
 * Hybrid search: the local catalog answers straight away and the registry page
 * is handed back unresolved, so a caller that only needs to render something
 * never waits for the network and one that does can await it itself.
 *
 * Every page the registry returns is folded into the catalog, which is what
 * makes the *next* search answer locally.
 */
export function createSearchPackages({ catalog, remote }: SearchDependencies) {
  async function fetchRemotePackages(
    filters: SearchFilters,
    options: SearchOptions,
    cursor?: string,
  ) {
    const page = await remote.search(filters, options, cursor);
    await catalog.upsert(page.items);
    return page;
  }

  async function searchPackages(
    filters: SearchFilters = {},
    options: SearchOptions = {},
  ): Promise<HybridSearchResult> {
    const localCatalog = catalog.load();
    const remotePage = fetchRemotePackages(filters, options);
    const stored = await localCatalog;
    const localResults = filterPackages(
      Object.values(stored),
      filters,
      options,
    );
    const limit = options.limitLocal;
    const visibleLocal =
      typeof limit === 'number' && limit >= 0
        ? localResults.slice(0, limit)
        : localResults;
    return { localResults: visibleLocal, remote: remotePage };
  }

  return { searchPackages, fetchRemotePackages };
}

export type { PackageSearchItem };
