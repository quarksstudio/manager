import { type AppConfig, type ConfigChanges } from '../domain/config';
import { type LoadedConfig } from '../lib/config-repository';
import { type Session } from '../lib/store';
export interface UseConfigReturn {
  config: AppConfig;
  loading: boolean;
  error: Error | null;
  updateConfig: (changes: ConfigChanges) => Promise<void>;
  sources: LoadedConfig['sources'] | null;
}
export interface UseSessionReturn {
  session: Session | null;
  loading: boolean;
  error: Error | null;
  clear: () => Promise<void>;
}
