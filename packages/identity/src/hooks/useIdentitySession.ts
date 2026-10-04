import { useCallback, useEffect, useRef, useState } from 'react';
import { APP_NAME, AUTH_SESSION_KEY } from '@quarks.studio/config';
import { getSession } from '../configured';
import { resolveSessionProfile } from '../infrastructure/profile-session';
import type { IdentitySession } from '../domain/auth-session';

export interface UseIdentitySessionReturn {
  session: IdentitySession | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: Error | null;
  reload(): Promise<void>;
}

export function useIdentitySession(): UseIdentitySessionReturn {
  const [session, setSession] = useState<IdentitySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mounted = useRef(false);
  const revision = useRef(0);
  const reload = useCallback(async () => {
    const request = ++revision.current;
    if (mounted.current) setLoading(true);
    try {
      const stored = await getSession();
      let value = stored;
      try {
        value = await resolveSessionProfile(stored);
      } catch {
        /* Keep the valid session; profile links remain unavailable until resolved. */
      }
      if (mounted.current && request === revision.current) {
        setSession(value);
        setError(null);
      }
    } catch (reason) {
      if (mounted.current && request === revision.current) {
        setSession(null);
        setError(reason instanceof Error ? reason : new Error(String(reason)));
      }
    } finally {
      if (mounted.current && request === revision.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === `${APP_NAME}:${AUTH_SESSION_KEY}`
      ) {
        void reload();
      }
    };
    const onFocus = () => {
      void reload();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    void reload();
    return () => {
      mounted.current = false;
      revision.current += 1;
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, [reload]);

  const accessToken =
    typeof session?.accessToken === 'string' && session.accessToken.trim()
      ? session.accessToken
      : null;
  return {
    session,
    accessToken,
    isAuthenticated: accessToken !== null,
    loading,
    error,
    reload,
  };
}
