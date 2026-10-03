import { createSearchPackages } from '@quarks.studio/package-search';
import { createHttpPackageSearch } from '@quarks.studio/package-search/http';
import { createStoragePackageCatalog } from '@quarks.studio/package-search/http';
import { createGlobalContext } from './ambient-context';
import { registryConfiguration } from './registry-configuration';
import type { PackageCatalogRepository } from '@quarks.studio/package-search';
import type {
  RemoteSearchPage,
  SearchFilters,
  SearchOptions,
} from '@quarks.studio/package-search';

/**
 * The catalog is process state: one copy per host, shared by every caller, so
 * a page fetched for one search is already there for the next.
 */
const catalog: PackageCatalogRepository = createStoragePackageCatalog();

async function ambientSearch() {
  const context = await createGlobalContext({
    baseUrl: registryConfiguration.registryUrl,
  });
  return createSearchPackages({
    catalog,
    remote: createHttpPackageSearch(context),
  });
}

async function searchPackages(
  filters: SearchFilters = {},
  options: SearchOptions = {},
) {
  const { searchPackages: run } = await ambientSearch();
  return run(filters, options);
}

async function fetchRemotePackages(
  filters: SearchFilters,
  options: SearchOptions,
  cursor?: string,
): Promise<RemoteSearchPage> {
  const { fetchRemotePackages: run } = await ambientSearch();
  return run(filters, options, cursor);
}

function resetPackageCatalogMemory(): void {
  catalog.reset();
}

export { fetchRemotePackages, resetPackageCatalogMemory, searchPackages };
export { CATALOG_KEY } from '@quarks.studio/package-search/http';
export { filterPackages } from '@quarks.studio/package-search';
export type {
  HybridSearchResult,
  PackageSearchItem,
  SearchFilters,
  SearchOptions,
  RemoteSearchPage,
} from '@quarks.studio/package-search';
