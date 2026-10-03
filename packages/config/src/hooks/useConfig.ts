import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_CONFIG,
  type AppConfig,
  type ConfigChanges,
} from '../domain/config';
import {
  loadConfig,
  reloadConfig,
  writeConfig,
  type LoadedConfig,
} from '../lib/config-repository';
import { type UseConfigReturn } from '../presentation/services';
import { useStorageEvent } from './useStorageEvent';
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
