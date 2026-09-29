import { isLogLevel, LOG_LEVELS } from '@quarks.studio/logger';

import {
  DEFAULT_CONFIG,
  isConfigKey,
  type AppConfig,
  type ConfigChanges,
  type ConfigKey,
  type ConfigValue,
} from '../domain/config';
import { envOverrides } from '../domain/env';
import {
  clearSession,
  loadPersisted,
  loadSession,
  persistConfig,
  saveSession,
  storeRevision,
} from './store';

export type ConfigLayer = 'default' | 'persisted' | 'env' | 'session';

export interface LoadedConfig {
  config: AppConfig;
  sources: Record<ConfigKey, ConfigLayer>;
}

interface Memo {
  revision: number;
  promise: Promise<LoadedConfig>;
  /** Undefined until `promise` settles; lets `getConfig` stay synchronous. */
  value: LoadedConfig | undefined;
}

let memo: Memo | undefined;

function startResolve(): Memo {
  const entry: Memo = {
    revision: storeRevision(),
    promise: undefined as unknown as Promise<LoadedConfig>,
    value: undefined,
  };
  entry.promise = resolve().then(
    (loaded) => {
      if (memo === entry) entry.value = loaded;
      return loaded;
    },
    (error: unknown) => {
      // Never cache a failed read: a transient storage error must not poison
      // the process for the rest of its life.
      if (memo === entry) memo = undefined;
      throw error;
    },
  );
  return entry;
}

function current(): Memo | undefined {
  if (memo?.revision !== storeRevision()) return undefined;
  return memo;
}

function text(value: ConfigValue | undefined, fallback: string): string {
  if (value === undefined) return fallback;
  if (Array.isArray(value)) return value.join(',');
  return String(value);
}

function models(value: ConfigValue | undefined, fallback: string[]): string[] {
  if (Array.isArray(value))
    return value.map((model) => model.trim()).filter(Boolean);
  if (value === undefined) return fallback;
  return text(value, '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
}

function flag(value: ConfigValue | undefined, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === undefined) return fallback;
  return text(value, 'true') !== 'false';
}

function normalize(candidate: ConfigChanges): AppConfig {
  return {
    token: text(candidate.token, DEFAULT_CONFIG.token),
    log: isLogLevel(candidate.log) ? candidate.log : DEFAULT_CONFIG.log,
    colors: flag(candidate.colors, DEFAULT_CONFIG.colors),
    editor: text(candidate.editor, DEFAULT_CONFIG.editor),
    ias: models(candidate.ias, DEFAULT_CONFIG.ias),
    registryUrl: text(candidate.registryUrl, DEFAULT_CONFIG.registryUrl),
    env: text(candidate.env, DEFAULT_CONFIG.env),
    renderMode: text(candidate.renderMode, DEFAULT_CONFIG.renderMode),
    authEmulatorHost: text(
      candidate.authEmulatorHost,
      DEFAULT_CONFIG.authEmulatorHost,
    ),
    localStoragePublicUrl: text(
      candidate.localStoragePublicUrl,
      DEFAULT_CONFIG.localStoragePublicUrl,
    ),
    localStorageEndpoint: text(
      candidate.localStorageEndpoint,
      DEFAULT_CONFIG.localStorageEndpoint,
    ),
    semgrepRulesPath: text(
      candidate.semgrepRulesPath,
      DEFAULT_CONFIG.semgrepRulesPath,
    ),
  };
}

function trace(
  persisted: Partial<AppConfig>,
  fromEnv: ConfigChanges,
  config: AppConfig,
): Record<ConfigKey, ConfigLayer> {
  const sources = {} as Record<ConfigKey, ConfigLayer>;
  for (const key of Object.keys(DEFAULT_CONFIG) as ConfigKey[]) {
    sources[key] =
      key in fromEnv
        ? 'env'
        : key in persisted
          ? 'persisted'
          : config[key] !== DEFAULT_CONFIG[key]
            ? 'session'
            : 'default';
  }
  return sources;
}

async function resolve(): Promise<LoadedConfig> {
  const [persisted, session] = await Promise.all([
    loadPersisted(),
    loadSession(),
  ]);
  const fromEnv = envOverrides();
  const config = normalize({ ...persisted, ...fromEnv });

  if (!fromEnv.token && session?.accessToken)
    config.token = session.accessToken;

  return { config, sources: trace(persisted, fromEnv, config) };
}

export function loadConfig(): Promise<LoadedConfig> {
  const settled = current();
  if (settled) return settled.promise;
  memo = startResolve();
  return memo.promise;
}

/** Last resolved configuration, or the defaults when nothing has loaded yet. */
export function getConfig(): AppConfig {
  return current()?.value?.config ?? DEFAULT_CONFIG;
}

export function reloadConfig(): Promise<LoadedConfig> {
  memo = startResolve();
  return memo.promise;
}

export function resetConfig(): void {
  memo = undefined;
}

export async function writeConfig(changes: ConfigChanges): Promise<AppConfig> {
  const log = changes.log;
  if (log !== undefined && !isLogLevel(log)) {
    throw new Error(
      `Invalid log level: ${String(log)}. Expected one of: ${LOG_LEVELS.join(', ')}`,
    );
  }

  const previous = (await loadConfig()).config;
  const next = normalize({ ...previous, ...changes });

  if (typeof changes.token === 'string') {
    if (changes.token) await saveSession({ accessToken: changes.token });
    else await clearSession();
  }

  await persistConfig(next);
  return (await loadConfig()).config;
}

export async function setConfigValue(
  key: string,
  value: string,
): Promise<AppConfig> {
  if (!isConfigKey(key)) throw new Error(`Unknown configuration key: ${key}`);
  return writeConfig({ [key]: value });
}
