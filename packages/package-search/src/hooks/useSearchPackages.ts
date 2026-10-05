import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  SearchFilters,
  SearchOptions,
  PackageSearchItem,
} from '../domain/package-search-item';
import {
  type PackageSearchServices,
  type UseSearchPackagesReturn,
  mergeUnique,
} from '../presentation/services';
import { useServices } from './useServices';
export function useSearchPackages(
  initialFilters: SearchFilters = {},
  override?: PackageSearchServices,
): UseSearchPackagesReturn {
  const { searchPackages: runSearchPackages, fetchRemotePackages } =
    useServices(override);
  const [localResults, setLocalResults] = useState<PackageSearchItem[]>([]);
  const [remoteResults, setRemoteResults] = useState<PackageSearchItem[]>([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
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
      setSearchError(null);
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
      } catch (error) {
        if (currentRequest === requestId.current)
          setSearchError(searchErrorMessage(error));
      } finally {
        if (currentRequest === requestId.current) setIsSearchingRemote(false);
      }
    },
    [runSearchPackages],
  );

  const loadRemoteResults = useCallback(async () => {
    if (!showRemote && remoteResults.length) {
      setShowRemote(true);
      return;
    }
    if (!nextCursor || isSearchingRemote) return;
    const currentRequest = requestId.current;
    setIsSearchingRemote(true);
    setSearchError(null);
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
    } catch (error) {
      if (currentRequest === requestId.current)
        setSearchError(searchErrorMessage(error));
    } finally {
      if (currentRequest === requestId.current) setIsSearchingRemote(false);
    }
  }, [
    fetchRemotePackages,
    isSearchingRemote,
    nextCursor,
    remoteResults.length,
    showRemote,
  ]);

  const reset = useCallback(() => {
    requestId.current += 1;
    setSearchError(null);
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
    searchError,
    hasMoreRemoteResults: (!showRemote && hiddenRemote) || nextCursor !== null,
    totalCount: remoteTotal ?? localResults.length,
    reset,
  };
}

function searchErrorMessage(error: unknown): string {
  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? error.status
      : undefined;
  return status === 400
    ? 'This search is not supported by the registry. Use a case-sensitive name prefix, exact tags, and avoid combining tags with author or private access.'
    : 'Could not load registry results. Please try again.';
}
