import { useCallback, useEffect, useRef, useState } from 'react';
import type { RemoteSearchPage } from '../domain/package-search-item';
import { mergeUnique } from '../presentation/services';
export interface PackageResultsServices {
  searchParams(params: URLSearchParams): Promise<RemoteSearchPage>;
}
export function usePackageSearchResults(
  searchParams: string,
  services: PackageResultsServices,
) {
  const [page, setPage] = useState<RemoteSearchPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unsupported, setUnsupported] = useState(false);
  const revision = useRef(0);
  const busy = useRef(false);
  const currentPage = useRef<RemoteSearchPage | null>(null);
  const load = useCallback(async () => {
    if (
      busy.current ||
      (currentPage.current && !currentPage.current.nextCursor)
    )
      return;
    busy.current = true;
    const request = ++revision.current;
    setLoading(true);
    setError('');
    setUnsupported(false);
    const params = new URLSearchParams(searchParams);
    if (currentPage.current?.nextCursor)
      params.set('cursor', currentPage.current.nextCursor);
    try {
      const result = await services.searchParams(params);
      if (request !== revision.current) return;
      const next = {
        ...result,
        items: mergeUnique(currentPage.current?.items ?? [], result.items),
      };
      currentPage.current = next;
      setPage(next);
    } catch (failure) {
      if (request !== revision.current) return;
      const status =
        typeof failure === 'object' && failure !== null && 'status' in failure
          ? failure.status
          : undefined;
      setUnsupported(status === 400);
      setError(
        status === 400
          ? 'This search is not supported. Use case-sensitive prefixes or exact tags, and avoid combining tags with author or private access.'
          : 'Could not load packages. Please try again.',
      );
    } finally {
      if (request === revision.current) {
        busy.current = false;
        setLoading(false);
      }
    }
  }, [searchParams, services]);
  useEffect(() => {
    currentPage.current = null;
    setPage(null);
    busy.current = false;
    void load();
    return () => {
      revision.current += 1;
      busy.current = false;
    };
  }, [load]);
  return { page, loading, error, unsupported, load };
}
