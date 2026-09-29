import { createSearchPackages } from '../catalog/application/search-packages';
import { createHttpPackageSearch } from '../catalog/infrastructure/http-package-search';
import { createStoragePackageCatalog } from '../catalog/infrastructure/storage-package-catalog';
import { createGlobalContext } from './ambient-context';
import { registryConfiguration } from './registry-configuration';
import type { PackageCatalogRepository } from '../catalog/application/package-catalog.repository';
import type {
  RemoteSearchPage,
  SearchFilters,
  SearchOptions,
} from '../catalog/domain/package-search-item';

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

export {
  fetchRemotePackages,
  resetPackageCatalogMemory,
  searchPackages,
};
export { CATALOG_KEY } from '../catalog/infrastructure/storage-package-catalog';
export { filterPackages } from '../catalog/domain/package-search-query';
export type {
  HybridSearchResult,
  PackageSearchItem,
  SearchFilters,
  SearchOptions,
  RemoteSearchPage,
} from '../catalog/domain/package-search-item';
