/**
 * Headless entrypoint: the registry without React, ink or the UI kit.
 *
 * The root entrypoint re-exports the React hooks and therefore drags the whole
 * renderer into any Node consumer. CLI-adjacent packages (the installer, the
 * publisher, scripts) import this subpath instead so their dependency graph
 * stays free of the UI.
 */

export { Client } from './composition/ambient-client';
export {
  AUTH_SESSION_KEY,
  ApiError,
  RegistryHttpError,
  apiFetch,
  apiRequest,
  createGlobalContext,
  type ApiFetchOptions,
} from './composition/ambient-context';

export {
  CATALOG_KEY,
  filterPackages,
  fetchRemotePackages,
  resetPackageCatalogMemory,
  searchPackages,
  type HybridSearchResult,
  type PackageSearchItem,
  type RemoteSearchPage,
  type SearchFilters,
  type SearchOptions,
} from './composition/ambient-search';

export {
  createRegistryClient,
  type RegistryClient,
  type RegistryClientOptions,
} from './client';

export {
  createHttpContext,
  type CachedResponse,
  type HttpContext,
  type OperationContext,
  type RegistryCache,
  type RegistryRequestOptions,
} from './transport/http-context';
export {
  DEFAULT_CACHE_TTL_MS,
  createStorageCache,
  type StorageCacheOptions,
} from './transport/storage-cache';

export { AUTH_MESSAGE } from './identity/domain/auth-callback-protocol';
export {
  type AuthProvider,
  type AuthSession,
  type AuthStep,
  type LoginOptions,
  type LoginStrategy,
} from './identity/domain/auth-session';
export {
  loginWithEmulator,
  loginWithProvider,
  submitManualLoginCode,
} from './composition/ambient-login';

export {
  sortVersions,
  highestVersion,
  compareVersions,
  certificationsForVersion,
  type Certification,
  type PackageDetails,
  type PackageVersion,
  type PackageReadme,
  type UpdatePackageMetadataInput,
} from './distribution/domain/package-details';

export type {
  AuthApi,
  GatewayApi,
  PackagesApi,
  RegistryApi,
} from './composition/api';
