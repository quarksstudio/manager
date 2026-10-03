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

export { AUTH_MESSAGE } from '@quarks.studio/identity';
export {
  type AuthProvider,
  type AuthSession,
  type AuthStep,
  type LoginOptions,
  type LoginStrategy,
} from '@quarks.studio/identity';
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
} from '@quarks.studio/distribution';

export type {
  AuthApi,
  CatalogApi,
  GatewayApi,
  PackagesApi,
  RegistryApi,
} from './composition/api';

export { browsePlans, browseTierLadder } from '@quarks.studio/commerce';
export type { CatalogRemote } from '@quarks.studio/commerce';
export {
  isPlanProduct,
  isTierProduct,
  tierName,
  type CatalogProduct,
  type ProductKind,
} from '@quarks.studio/commerce';
export { formatPrice } from '@quarks.studio/commerce';
export {
  hasTierOverlap,
  isPurchasable,
  sortByPrice,
  type TierOffer,
} from '@quarks.studio/commerce';
export {
  partitionPlanSystems,
  planSignupNote,
  type PaymentSystem,
  type PaymentSystems,
  type PendingSystem,
  type PlanSystems,
} from '@quarks.studio/commerce';
export {
  paymentLinkPath,
  type PaymentLinkTarget,
} from '@quarks.studio/commerce';
export { heldTier } from '@quarks.studio/certification';
export type {
  CreatedSubscription,
  PaymentLink,
  SubscriptionCancelResult,
  SubscriptionRecord,
} from '@quarks.studio/commerce';

export type {
  PaymentRecord,
  PaymentPage,
  PaymentListOptions,
} from '@quarks.studio/commerce';
