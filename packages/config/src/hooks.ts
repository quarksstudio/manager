import { useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_CONFIG,
  type AppConfig,
  type ConfigChanges,
} from './domain/config';
import {
  loadConfig,
  reloadConfig,
  writeConfig,
  type LoadedConfig,
} from './lib/config-repository';
import {
  APP_NAME,
  AUTH_SESSION_KEY,
  CONFIG_KEY,
  clearSession,
  loadSession,
  type Session,
} from './lib/store';

export interface UseConfigReturn {
  config: AppConfig;
  loading: boolean;
  error: Error | null;
  updateConfig: (changes: ConfigChanges) => Promise<void>;
  sources: LoadedConfig['sources'] | null;
}

/**
 * Other tabs change the stored session and configuration behind our back. The
 * browser never fires `storage` in the tab that wrote, so this only covers
 * cross-tab synchronization, which is exactly the gap a login in a popup or a
 * second window leaves behind.
 */
function useStorageEvent(onChange: () => void): void {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const keys = [
      `${APP_NAME}:${AUTH_SESSION_KEY}`,
      `${APP_NAME}:${CONFIG_KEY}`,
    ];
    const listener = (event: StorageEvent) => {
      if (event.key !== null && !keys.includes(event.key)) return;
      onChange();
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, [onChange]);
}

export function useConfig(): UseConfigReturn {
  const [config, setConfig] = useState<AppConfig>({ ...DEFAULT_CONFIG });
  const [sources, setSources] = useState<LoadedConfig['sources'] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const loaded = await loadConfig();
      setConfig(loaded.config);
      setSources(loaded.sources);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    const loaded = await reloadConfig();
    setConfig(loaded.config);
    setSources(loaded.sources);
  }, []);

  const updateConfig = useCallback(async (changes: ConfigChanges) => {
    const next = await writeConfig(changes);
    setConfig(next);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useStorageEvent(() => {
    void refresh().catch(() => undefined);
  });

  return { config, loading, error, updateConfig, sources };
}

export interface UseSessionReturn {
  session: Session | null;
  loading: boolean;
  error: Error | null;
  clear: () => Promise<void>;
}

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

export default useConfig;
