import { useCallback, useEffect, useState, useRef } from 'react';
import type { CachedQuery, CachedQueryOptions } from '../domain/query-cache';
/** A cache-backed query; the host supplies its storage and namespace. */
export function useCachedQuery<T>({
  cache,
  key,
  load,
  enabled,
  ttlMs,
}: CachedQueryOptions<T>): CachedQuery<T> {
  const [state, setState] = useState<Omit<CachedQuery<T>, 'refetch'>>({
    data: null,
    error: null,
    loading: enabled,
  });
  const [revision, setRevision] = useState(0);
  const latestLoad = useRef(load);
  latestLoad.current = load;
  const refreshKey = useRef<string | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    const request = ++generation.current;
    if (!enabled) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    const forceFresh = refreshKey.current === key;
    refreshKey.current = null;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    void (async () => {
      try {
        if (forceFresh) {
          try {
            await cache.removeItem(key);
          } catch {
            /* Storage may be unavailable. */
          }
        } else {
          try {
            const cached = await cache.getItem<T>(key);
            if (request !== generation.current) return;
            if (cached !== null) {
              setState({ data: cached, error: null, loading: false });
              return;
            }
          } catch {
            /* A failed read falls through to the loader. */
          }
        }
        if (request !== generation.current) return;
        const fresh = await latestLoad.current();
        if (request !== generation.current) return;
        await cache.setItem(key, fresh, ttlMs);
        if (request === generation.current)
          setState({ data: fresh, error: null, loading: false });
      } catch (error) {
        if (request === generation.current)
          setState({ data: null, error, loading: false });
      }
    })();
    return () => {
      generation.current++;
    };
  }, [cache, key, enabled, ttlMs, revision]);
  const refetch = useCallback(() => {
    refreshKey.current = key;
    setRevision((value) => value + 1);
  }, [key]);
  return { ...state, refetch };
}
