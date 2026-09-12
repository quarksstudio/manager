import { createStorage } from '@quark/use-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Client } from './lib';
import {
  fetchRemotePackages,
  searchPackages as runSearchPackages,
  type PackageSearchItem,
  type SearchFilters,
  type SearchOptions,
} from './search-packages';
import {
  loginWithProvider,
  submitManualLoginCode,
  type AuthSession,
  type AuthStep,
  type LoginOptions,
} from './auth-login';
import {
  certificationsForVersion,
  highestVersion,
  type Certification,
  type PackageDetails,
  type PackageReadme,
  type PackageVersion,
  type UpdatePackageMetadataInput,
} from './package-details';

export interface RegistryQuery<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
  refetch: () => void;
}

interface RegistryPackages {
  search(query?: string): Promise<Array<[string, string]>>;
  get<T = Record<string, unknown>>(name: string): Promise<T>;
  getReadme<T = PackageReadme>(name: string, version: string): Promise<T>;
  downloadBundle(name: string, version: string): Promise<Response>;
  update(body: Record<string, unknown>, isNew?: boolean): Promise<unknown>;
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

export function useAuthLogin(): UseAuthLoginReturn {
  const [currentStep, setCurrentStep] = useState<AuthStep>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<AuthSession['user'] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const authRequest = useRef(0);

  const login = useCallback(async (options: LoginOptions) => {
    const currentRequest = ++authRequest.current;
    setIsLoading(true);
    setError(null);
    try {
      const session = await loginWithProvider(options, (step) => {
        if (currentRequest === authRequest.current) setCurrentStep(step);
      });
      if (currentRequest === authRequest.current) setUser(session.user);
      return session;
    } catch (reason) {
      const failure =
        reason instanceof Error ? reason : new Error(String(reason));
      if (currentRequest === authRequest.current) setError(failure);
      throw failure;
    } finally {
      if (currentRequest === authRequest.current) setIsLoading(false);
    }
  }, []);

  const submitManualCode = useCallback(async (code: string) => {
    submitManualLoginCode(code);
  }, []);

  const reset = useCallback(() => {
    authRequest.current += 1;
    setCurrentStep('idle');
    setIsLoading(false);
    setUser(null);
    setError(null);
  }, []);

  return {
    login,
    submitManualCode,
    currentStep,
    isLoading,
    isAuthenticated: currentStep === 'authenticated' && user !== null,
    user,
    error,
    reset,
  };
}

export function useRegistryClient(): RegistryClient {
  return useMemo(() => new Client() as unknown as RegistryClient, []);
}

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

export function useSearchPackages(
  initialFilters: SearchFilters = {},
): UseSearchPackagesReturn {
  const [localResults, setLocalResults] = useState<PackageSearchItem[]>([]);
  const [remoteResults, setRemoteResults] = useState<PackageSearchItem[]>([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [remoteTotal, setRemoteTotal] = useState<number | null>(null);
  const [showRemote, setShowRemote] = useState(false);
  const requestId = useRef(0);
  const filtersRef = useRef<SearchFilters>({});
  const optionsRef = useRef<SearchOptions>({});

  const search = useCallback(
    async (filters: SearchFilters, options: SearchOptions = {}) => {
      const currentRequest = ++requestId.current;
      filtersRef.current = filters;
      optionsRef.current = options;
      setRemoteResults([]);
      setNextCursor(null);
      setRemoteTotal(null);
      setShowRemote(false);
      setIsSearchingRemote(true);
      try {
        const hybrid = await runSearchPackages(filters, options);
        if (currentRequest !== requestId.current) return;
        setLocalResults(hybrid.localResults);
        const remote = await hybrid.remote;
        if (currentRequest !== requestId.current) return;
        setRemoteResults(remote.items);
        setNextCursor(remote.nextCursor);
        setRemoteTotal(remote.totalCount);
        if (hybrid.localResults.length === 0) setShowRemote(true);
      } catch {
        // Local results remain usable when the background request fails.
      } finally {
        if (currentRequest === requestId.current) setIsSearchingRemote(false);
      }
    },
    [],
  );

  const loadRemoteResults = useCallback(async () => {
    if (!showRemote && remoteResults.length) {
      setShowRemote(true);
      return;
    }
    if (!nextCursor || isSearchingRemote) return;
    const currentRequest = requestId.current;
    setIsSearchingRemote(true);
    try {
      const page = await fetchRemotePackages(
        filtersRef.current,
        optionsRef.current,
        nextCursor,
      );
      if (currentRequest !== requestId.current) return;
      setRemoteResults((current) => mergeUnique(current, page.items));
      setNextCursor(page.nextCursor);
      setRemoteTotal(page.totalCount);
      setShowRemote(true);
    } catch {
      // Keep already available local and remote results.
    } finally {
      if (currentRequest === requestId.current) setIsSearchingRemote(false);
    }
  }, [isSearchingRemote, nextCursor, remoteResults.length, showRemote]);

  const reset = useCallback(() => {
    requestId.current += 1;
    setLocalResults([]);
    setRemoteResults([]);
    setIsSearchingRemote(false);
    setNextCursor(null);
    setRemoteTotal(null);
    setShowRemote(false);
  }, []);

  const initialKey = JSON.stringify(initialFilters);
  useEffect(() => {
    void search(JSON.parse(initialKey) as SearchFilters);
  }, [initialKey, search]);

  const visibleRemote = showRemote ? remoteResults : [];
  const combinedResults = mergeUnique(localResults, visibleRemote);
  const hiddenRemote = remoteResults.some(
    (remote) => !localResults.some((local) => local.name === remote.name),
  );
  return {
    search,
    loadRemoteResults,
    localResults,
    remoteResults,
    combinedResults,
    isSearchingRemote,
    hasMoreRemoteResults: (!showRemote && hiddenRemote) || nextCursor !== null,
    totalCount: remoteTotal ?? localResults.length,
    reset,
  };
}

export function useFetchPackage<T = Record<string, unknown>>(
  name: string,
): RegistryQuery<T> {
  const client = useRegistryClient();
  const load = useCallback(() => client.Packages.get<T>(name), [client, name]);
  return useRegistryQuery(load, !!name);
}

export function usePackageReadme(
  name: string,
  version?: string,
): RegistryQuery<PackageReadme> {
  const client = useRegistryClient();
  const load = useCallback(
    () => client.Packages.getReadme<PackageReadme>(name, version as string),
    [client, name, version],
  );
  return useRegistryQuery(load, !!name && !!version);
}

export type UsePackageCertificationsReturn = {
  data: Certification[] | null;
  versions: PackageVersion[];
  latestVersion?: string;
  loading: boolean;
  error: unknown;
  refetch: () => void;
};

export function usePackageCertifications(
  name: string,
  version?: string,
): UsePackageCertificationsReturn {
  const {
    data: detail,
    loading,
    error,
    refetch,
  } = useFetchPackage<PackageDetails>(name);
  const versions = detail?.versions ?? [];
  const target = version ?? highestVersion(versions)?.version;
  return {
    data: target ? certificationsForVersion(detail, target) : null,
    versions,
    latestVersion: highestVersion(versions)?.version,
    loading,
    error,
    refetch,
  };
}

export interface UseUpdatePackageMetadataReturn {
  save: (input: UpdatePackageMetadataInput) => Promise<void>;
  status: 'idle' | 'saving' | 'success' | 'error';
  error: Error | null;
  reset: () => void;
}

export function useUpdatePackageMetadata(): UseUpdatePackageMetadataReturn {
  const client = useRegistryClient();
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<Error | null>(null);

  const save = useCallback(
    async (input: UpdatePackageMetadataInput) => {
      setStatus('saving');
      setError(null);
      try {
        await client.Packages.update({
          id: input.id,
          description: input.description,
          tags: input.tags,
          authors: input.authors,
        });
        setStatus('success');
      } catch (reason) {
        const failure =
          reason instanceof Error ? reason : new Error(String(reason));
        setError(failure);
        setStatus('error');
        throw failure;
      }
    },
    [client],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return { save, status, error, reset };
}

function mergeUnique(
  first: PackageSearchItem[],
  second: PackageSearchItem[],
): PackageSearchItem[] {
  const packages = new Map(first.map((item) => [item.name, item]));
  for (const item of second) packages.set(item.name, item);
  return [...packages.values()];
}

export function useCurrentUser<
  T = Record<string, unknown>,
>(): RegistryQuery<T> {
  const client = useRegistryClient();
  const load = useCallback(() => client.Auth.me<T>(), [client]);
  return useRegistryQuery(load);
}

function useRegistryQuery<T>(
  load: () => Promise<T>,
  enabled = true,
): RegistryQuery<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(enabled);
  const [request, setRequest] = useState(0);
  const refetch = useCallback(() => setRequest((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError(undefined);
    void load()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, load, request]);

  return { data, error, loading, refetch };
}

/** Authentication state only; terminal lifecycle belongs to the caller. */
export function useAuthLogout() {
  const client = useRegistryClient();
  const [status, setStatus] = useState<
    'idle' | 'running' | 'success' | 'error'
  >('idle');
  const [error, setError] = useState<Error | null>(null);
  const logout = useCallback(async () => {
    setStatus('running');
    setError(null);
    try {
      await client.Auth.logout();
      await createStorage({ namespace: 'app' }).removeItem('auth:session');
      setStatus('success');
    } catch (reason) {
      const failure =
        reason instanceof Error ? reason : new Error(String(reason));
      setError(failure);
      setStatus('error');
      throw failure;
    }
  }, [client]);
  return { logout, status, error };
}
