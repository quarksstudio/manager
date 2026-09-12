import { useCallback, useEffect, useRef, useState } from 'react';

import { apiCache } from '../lib/storage';

interface CachedQueryState<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
}

export interface CachedQuery<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
  refetch: () => void;
}

export function useCachedQuery<T>(
  cacheKey: string,
  load: () => Promise<T>,
  enabled: boolean,
  ttlMs?: number,
): CachedQuery<T> {
  const [state, setState] = useState<CachedQueryState<T>>({
    data: null,
    error: null,
    loading: enabled,
  });
  const latestLoad = useRef(load);
  latestLoad.current = load;

  const fetchFresh = useCallback(async () => {
    try {
      const fresh = await latestLoad.current();
      await apiCache.setItem(cacheKey, fresh, ttlMs);
      setState({ data: fresh, error: null, loading: false });
    } catch (error) {
      setState({ data: null, error, loading: false });
    }
  }, [cacheKey, ttlMs]);

  const run = useCallback(async () => {
    try {
      const cached = await apiCache.getItem<T>(cacheKey);
      if (cached !== null) {
        setState({ data: cached, error: null, loading: false });
        return;
      }
    } catch {
      // A failed read falls through to the network fetch.
    }
    await fetchFresh();
  }, [cacheKey, fetchFresh]);

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    void run();
  }, [enabled, run]);

  const refetch = useCallback(() => {
    void (async () => {
      setState((previous) => ({ ...previous, loading: true, error: null }));
      try {
        await apiCache.removeItem(cacheKey);
      } catch {
        // The cache may be unavailable; the fetch below still refreshes state.
      }
      await fetchFresh();
    })();
  }, [cacheKey, fetchFresh]);

  return { ...state, refetch };
}
