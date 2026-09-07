import { Client } from './lib';
export { Client };
export {
  filterPackages,
  searchPackages,
  type HybridSearchResult,
  type PackageSearchItem,
  type RemoteSearchPage,
  type SearchFilters,
  type SearchOptions,
} from './search-packages';
export {
  AUTH_SESSION_KEY,
  apiFetch,
  apiRequest,
  type ApiFetchOptions,
} from './lib/api-fetch';
export {
  loginWithProvider,
  type AuthProvider,
  type AuthSession,
  type AuthStep,
  type LoginOptions,
  type LoginStrategy,
} from './auth-login';
export {
  useCurrentUser,
  useAuthLogin,
  useFetchPackage,
  useRegistryClient,
  useSearchPackages,
  type RegistryClient,
  type RegistryQuery,
  type UseSearchPackagesReturn,
  type UseAuthLoginReturn,
} from './hooks';
export default function client(e?: string): Client;
