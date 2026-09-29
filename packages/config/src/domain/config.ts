import { type LogLevel } from '@quarks.studio/logger';

export interface AppConfig {
  token: string;
  log: LogLevel;
  colors: boolean;
  editor: string;
  ias: string[];
  registryUrl: string;
  env: string;
  renderMode: string;
  authEmulatorHost: string;
  localStoragePublicUrl: string;
  localStorageEndpoint: string;
  semgrepRulesPath: string;
}

export type ConfigKey = keyof AppConfig;

export type ConfigValue = string | string[] | boolean;

export type ConfigChanges = Partial<Record<ConfigKey, ConfigValue | undefined>>;

export const CONFIG_KEYS = [
  'token',
  'log',
  'colors',
  'editor',
  'ias',
  'registryUrl',
  'env',
  'renderMode',
  'authEmulatorHost',
  'localStoragePublicUrl',
  'localStorageEndpoint',
  'semgrepRulesPath',
] as const satisfies ReadonlyArray<ConfigKey>;

/** Credentials that are resolved from the environment or session only. */
export const SECRET_KEYS = [
  'token',
] as const satisfies ReadonlyArray<ConfigKey>;

export const DEFAULT_AI_MODELS = ['gpt-4o', 'claude-3-opus'];

export const DEFAULT_CONFIG: AppConfig = {
  token: '',
  log: 'silent',
  colors: true,
  editor: 'nano',
  ias: [...DEFAULT_AI_MODELS],
  registryUrl: 'https://api.quarks.studio/v1',
  env: 'production',
  renderMode: 'ssr',
  authEmulatorHost: '',
  localStoragePublicUrl: '',
  localStorageEndpoint: '',
  semgrepRulesPath: 'auto',
};

export function isConfigKey(key: string): key is ConfigKey {
  return (CONFIG_KEYS as ReadonlyArray<string>).includes(key);
}

export function isSecretKey(key: string): boolean {
  return (SECRET_KEYS as ReadonlyArray<string>).includes(key);
}

export function withoutSecrets(config: AppConfig): Partial<AppConfig> {
  const persisted: Partial<AppConfig> = { ...config };
  for (const key of SECRET_KEYS) delete persisted[key];
  return persisted;
}
