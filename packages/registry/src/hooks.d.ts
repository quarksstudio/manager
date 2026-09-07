import {
  type PackageSearchItem,
  type SearchFilters,
  type SearchOptions,
} from './search-packages';
import {
  type AuthSession,
  type AuthStep,
  type LoginOptions,
} from './auth-login';
export interface RegistryQuery<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
  refetch: () => void;
}
interface RegistryPackages {
  search(query?: string): Promise<Array<[string, string]>>;
  get<T = Record<string, unknown>>(name: string): Promise<T>;
}
interface RegistryAuth {
  me<T = Record<string, unknown>>(): Promise<T>;
  logout(): Promise<unknown>;
  getUrlLogin(provider: string, continueUri: string): Promise<string>;
}
export interface RegistryClient {
  Packages: RegistryPackages;
  Auth: RegistryAuth;
}
export interface UseAuthLoginReturn {
  login: (options: LoginOptions) => Promise<AuthSession>;
  submitManualCode: (code: string) => Promise<void>;
  currentStep: AuthStep;
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthSession['user'] | null;
  error: Error | null;
  reset: () => void;
}
export declare function useAuthLogin(): UseAuthLoginReturn;
export declare function useRegistryClient(): RegistryClient;
export interface UseSearchPackagesReturn {
  search: (filters: SearchFilters, options?: SearchOptions) => Promise<void>;
  loadRemoteResults: () => Promise<void>;
  localResults: PackageSearchItem[];
  remoteResults: PackageSearchItem[];
  combinedResults: PackageSearchItem[];
  isSearchingRemote: boolean;
  hasMoreRemoteResults: boolean;
  totalCount: number;
  reset: () => void;
}
export declare function useSearchPackages(
  initialFilters?: SearchFilters,
): UseSearchPackagesReturn;
export declare function useFetchPackage<T = Record<string, unknown>>(
  name: string,
): RegistryQuery<T>;
export declare function useCurrentUser<
  T = Record<string, unknown>,
>(): RegistryQuery<T>;
export {};
