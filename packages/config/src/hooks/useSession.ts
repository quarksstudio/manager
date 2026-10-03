import { useCallback, useEffect, useState } from 'react';
import { clearSession, loadSession, type Session } from '../lib/store';
import { type UseSessionReturn } from '../presentation/services';
import { useStorageEvent } from './useStorageEvent';
export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    try {
      setSession(await loadSession());
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useStorageEvent(() => {
    void load();
  });

  return {
    session,
    loading,
    error,
    clear: async () => {
      await clearSession();
      await load();
    },
  };
}
