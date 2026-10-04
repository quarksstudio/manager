import { createSearchPackages } from '../index';
import { createHttpPackageSearch } from '../http';
import { createStoragePackageCatalog } from '../http';
import { createGlobalContext } from '@quarks.studio/config/http';
import type { PackageCatalogRepository } from '../index';
import type { RemoteSearchPage, SearchFilters, SearchOptions } from '../index';

/**
 * The catalog is process state: one copy per host, shared by every caller, so
 * a page fetched for one search is already there for the next.
 */
const catalog: PackageCatalogRepository = createStoragePackageCatalog();

async function ambientSearch() {
  const context = await createGlobalContext();
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
export { CATALOG_KEY } from '../http';
export { filterPackages } from '../index';
export type {
  HybridSearchResult,
  PackageSearchItem,
  SearchFilters,
  SearchOptions,
  RemoteSearchPage,
} from '../index';
