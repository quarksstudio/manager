import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_CONFIG, type AppConfig } from './domain/config';
import {
  CONFIG_FILE,
  loadConfig,
  writeConfig,
  type LoadedConfig,
} from './lib/config-repository';

export interface UseConfigReturn {
  config: AppConfig;
  loading: boolean;
  error: Error | null;
  updateConfig: (changes: Partial<AppConfig>) => Promise<void>;
  filePath: string;
}

export function useConfig(): UseConfigReturn {
  const [config, setConfig] = useState<AppConfig>({ ...DEFAULT_CONFIG });
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const loaded: LoadedConfig = await loadConfig();
      setConfig(loaded.config);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (changes: Partial<AppConfig>) => {
    const next = await writeConfig(changes);
    setConfig(next);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { config, loading, error, updateConfig, filePath: CONFIG_FILE };
}

export default useConfig;
