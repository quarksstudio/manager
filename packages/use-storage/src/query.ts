import { useCallback, useEffect, useState } from 'react';
import type { RegistryQuery } from '@quarks.studio/types/query';
export type { RegistryQuery } from '@quarks.studio/types/query';
export function useRegistryQuery<T>(
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
